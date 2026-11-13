import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ENV_NAME_PATTERN, loadTopology, type Topology } from './config/env-yaml';
import { loadGlobalConfig, type GlobalConfig } from './config/global-config';
import { currentEnvFile, dataDir, EnvPaths, envsDir } from './config/paths';
import { readDotenv } from './env/dotenv';
import {
	hashValues,
	resolveEnv,
	resolveRunnerEnv,
	type ResolveContext,
	type ResolvedEnv,
} from './env/resolve';
import { RigError } from './errors';
import { launcherSource, type LauncherSource } from './launcher/binary';
import { buildLauncherConfig, type LauncherConfig } from './launcher/config';
import { readTunnelUrl } from './services/tunnel';
import { type ResolvedSource, resolveSource } from './source';
import {
	launcherComponents,
	processComponents,
	RUNNER_LAYERS,
	ROLES,
	type Component,
	type LauncherComponent,
	type ProcessComponent,
} from './topology/components';
import { RIG } from './self/build-info';

export function listEnvNames(): string[] {
	if (!existsSync(envsDir())) return [];
	return readdirSync(envsDir(), { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(envsDir(), entry.name, 'env.yaml')))
		.map((entry) => entry.name)
		.sort();
}

export function currentEnvName(): string | undefined {
	const file = currentEnvFile();
	if (!existsSync(file)) return undefined;
	const name = readFileSync(file, 'utf8').trim();
	return name.length > 0 ? name : undefined;
}

export function setCurrentEnv(name: string | undefined): void {
	mkdirSync(dataDir(), { recursive: true });
	writeFileSync(currentEnvFile(), name ? `${name}\n` : '');
}

export function envPaths(name: string): EnvPaths {
	if (!ENV_NAME_PATTERN.test(name)) {
		throw new RigError(
			`Invalid environment name "${name}". Use lowercase letters, digits, and dashes.`,
		);
	}
	return new EnvPaths(join(envsDir(), name));
}

/** Picks the environment: the `--env` flag, then `RIG_ENV`, then the default environment. */
export function selectEnvName(flag: string | undefined): string {
	const name = flag ?? process.env.RIG_ENV ?? currentEnvName();
	if (!name) {
		const names = listEnvNames();
		if (names.length === 1) return names[0];
		throw new RigError(
			'No environment selected.',
			names.length === 0
				? `Create one with \`${RIG} create\`.`
				: `Run \`${RIG} use <name>\`. Environments: ${names.join(', ')}.`,
		);
	}
	if (!existsSync(envPaths(name).envYaml)) {
		throw new RigError(
			`Environment "${name}" does not exist.`,
			`Run \`${RIG} ls\` to see your environments.`,
		);
	}
	return name;
}

/** A loaded environment. Reload it to see changes in env.yaml. */
export class RigEnv {
	readonly topology: Topology;
	readonly globalConfig: GlobalConfig;
	readonly repoRoot: string | undefined;
	readonly source: ResolvedSource;

	constructor(
		readonly name: string,
		readonly paths: EnvPaths,
		options: { source?: ResolvedSource } = {},
	) {
		this.topology = loadTopology(paths.envYaml);
		this.globalConfig = loadGlobalConfig();
		this.source = options.source ?? resolveSource(this.topology.source, this.globalConfig.repo);
		this.repoRoot = this.source.root;
	}

	launcherSource(): LauncherSource {
		return launcherSource(this.globalConfig, this.repoRoot);
	}

	/** The n8n checkout. Throws with a hint when there is none. */
	requireRepoRoot(): string {
		if (this.repoRoot) return this.repoRoot;
		throw this.source.problem ?? new RigError('rig needs an n8n checkout as the source.');
	}

	static load(flag: string | undefined): RigEnv {
		const name = selectEnvName(flag);
		return new RigEnv(name, envPaths(name));
	}

	reload(): RigEnv {
		// Keep the checkout: a running session must not switch sources.
		return new RigEnv(this.name, this.paths, { source: this.source });
	}

	context(overrides: Partial<ResolveContext> = {}): ResolveContext {
		return {
			topology: this.topology,
			paths: this.paths,
			repoRoot: this.repoRoot,
			tunnelUrl: this.tunnelUrl(),
			...overrides,
		};
	}

	/** The public HTTPS URL of the tunnel. Read on every call: the tunnel can start or stop at any time. */
	tunnelUrl(): string | undefined {
		return readTunnelUrl(this.paths, this.topology);
	}

	processes(): ProcessComponent[] {
		return processComponents(this.topology);
	}

	launchers(): LauncherComponent[] {
		return launcherComponents(this.topology, this.processes(), (main) => {
			const { env } = resolveEnv(this.context(), main);
			return env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true';
		});
	}

	components(): Component[] {
		return [...this.processes(), ...this.launchers()];
	}

	component(name: string): Component | undefined {
		return this.components().find((c) => c.name === name);
	}

	/** Resolves a component name or a role to components. */
	select(target: string): Component[] {
		const components = this.components();
		const exact = components.find((c) => c.name === target);
		if (exact) return [exact];
		const byRole = components.filter((c) => c.role === target);
		if (byRole.length > 0) return byRole;
		throw new RigError(
			`Unknown component or role "${target}".`,
			`Choose one of: ${[...new Set([...components.map((c) => c.role), ...components.map((c) => c.name)])].join(', ')}.${suggest(
				target,
				components.map((c) => c.name),
			)}`,
		);
	}

	resolve(component: Component, overrides: Partial<ResolveContext> = {}): ResolvedEnv {
		return resolveEnv(this.context(overrides), component);
	}

	runnerOverrides(host: string): { js: Record<string, string>; python: Record<string, string> } {
		return {
			js: resolveRunnerEnv(this.context(), host, 'runner-js').env,
			python: resolveRunnerEnv(this.context(), host, 'runner-py').env,
		};
	}

	launcherConfig(component: LauncherComponent): LauncherConfig {
		if (!this.repoRoot)
			throw new RigError('The launcher config needs an n8n checkout as the source.');
		return buildLauncherConfig({
			component,
			repoRoot: this.repoRoot,
			languages: this.topology.runners.languages,
			overrides: this.runnerOverrides(component.host.name),
		});
	}

	/** A hash of everything that a restart applies: env, command, and launcher config. */
	componentHash(component: Component, overrides: Partial<ResolveContext> = {}): string {
		const { env } = this.resolve(component, overrides);
		if (component.kind === 'launcher') return hashValues(env, this.launcherConfig(component));
		return hashValues(env, this.repoRoot);
	}

	/** The editor URL of a main. Respects `N8N_EDITOR_BASE_URL`, `N8N_PROTOCOL`, and `N8N_PATH`. */
	editorUrl(name = 'main-1'): string {
		const main = this.component(name);
		if (main?.kind !== 'process' || main.role !== 'main') {
			throw new RigError(`"${name}" is not a main.`);
		}
		const { env } = this.resolve(main);
		if (env.N8N_EDITOR_BASE_URL) return env.N8N_EDITOR_BASE_URL;
		const protocol = env.N8N_PROTOCOL ?? 'http';
		const path = env.N8N_PATH ?? '/';
		return `${protocol}://localhost:${env.N8N_PORT ?? main.ports.http}${path.startsWith('/') ? path : `/${path}`}`;
	}

	/** Names that `rig env set --on` accepts. */
	layerTargets(): string[] {
		const components = this.components();
		const targets = new Set<string>(['shared']);
		for (const role of ROLES) {
			if (components.some((c) => c.role === role)) targets.add(role);
		}
		if (this.topology.runners.mode === 'external')
			RUNNER_LAYERS.forEach((layer) => targets.add(layer));
		for (const component of components) {
			targets.add(component.name);
			if (component.kind === 'launcher') {
				for (const layer of RUNNER_LAYERS) targets.add(`${layer}@${component.host.name}`);
			}
		}
		return [...targets];
	}

	/** Components that a change in a layer file affects. */
	affectedBy(layer: string): Component[] {
		const components = this.components();
		if (layer === 'shared' || layer === 'secrets') return components;
		for (const runnerLayer of RUNNER_LAYERS) {
			if (layer === runnerLayer) return components.filter((c) => c.kind === 'launcher');
			if (layer.startsWith(`${runnerLayer}@`)) {
				const host = layer.slice(runnerLayer.length + 1);
				return components.filter((c) => c.kind === 'launcher' && c.host.name === host);
			}
		}
		return components.filter((c) => c.role === layer || c.name === layer);
	}

	hasLayerKey(layer: string, key: string): boolean {
		return readDotenv(this.paths.layerFile(layer)).some((entry) => entry.key === key);
	}
}

function distance(a: string, b: string): number {
	const dp = Array.from({ length: a.length + 1 }, (_, i) => [
		i,
		...Array<number>(b.length).fill(0),
	]);
	for (let j = 1; j <= b.length; j++) dp[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			dp[i][j] = Math.min(
				dp[i - 1][j] + 1,
				dp[i][j - 1] + 1,
				dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
		}
	}
	return dp[a.length][b.length];
}

export function suggest(input: string, options: string[]): string {
	let best: string | undefined;
	let bestDistance = Infinity;
	for (const option of options) {
		const d = distance(input, option);
		if (d < bestDistance) {
			best = option;
			bestDistance = d;
		}
	}
	return best && bestDistance <= 3 ? ` Did you mean "${best}"?` : '';
}
