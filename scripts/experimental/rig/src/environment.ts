import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	ENV_NAME_PATTERN,
	loadTopology,
	PROFILE_NAME_PATTERN,
	type Topology,
} from './config/env-yaml';
import { loadGlobalConfig, type GlobalConfig } from './config/global-config';
import {
	currentEnvFile,
	dataDir,
	displayPath,
	EnvPaths,
	envsDir,
	globalSecretsFile,
	profileFile,
	profilesDir,
} from './config/paths';
import { readDotenv } from './env/dotenv';
import {
	configuredValues,
	hashValues,
	resolveEnv,
	resolveRunnerEnv,
	type ResolveContext,
	type ResolvedEnv,
} from './env/resolve';
import { RigError } from './errors';
import { launcherSource, type LauncherSource } from './launcher/binary';
import { buildLauncherConfig, type LauncherConfig } from './launcher/config';
import { mailpitUrl } from './services/compose';
import { readTunnelUrl } from './services/tunnel';
import { type ResolvedSource, resolveSource } from './source';
import {
	launcherComponents,
	runnerComponents,
	processComponents,
	RUNNER_LAYERS,
	ROLES,
	type Component,
	type LauncherComponent,
	type ProcessComponent,
	type RunnerComponent,
	type RunnerHostComponent,
} from './topology/components';
import { RIG } from './meta';

export const GLOBAL_SECRETS_LAYER = 'global-secrets';
export const PROFILE_PREFIX = 'profile:';

/** The profile name of a `profile:<name>` layer target. */
export function profileName(layer: string): string | undefined {
	if (!layer.startsWith(PROFILE_PREFIX)) return undefined;
	const name = layer.slice(PROFILE_PREFIX.length);
	return PROFILE_NAME_PATTERN.test(name) ? name : undefined;
}

/** Profiles in ~/.config/rig/profiles. */
export function listProfiles(): string[] {
	if (!existsSync(profilesDir())) return [];
	return readdirSync(profilesDir())
		.filter((file) => file.endsWith('.env'))
		.map((file) => file.slice(0, -'.env'.length))
		.filter((name) => PROFILE_NAME_PATTERN.test(name))
		.sort();
}

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
	/** Overrides for `rig run -e` and `--inherit-env`. Every resolve applies them. */
	private readonly overrides: Partial<ResolveContext>;

	constructor(
		readonly name: string,
		readonly paths: EnvPaths,
		options: { source?: ResolvedSource; overrides?: Partial<ResolveContext> } = {},
	) {
		this.topology = loadTopology(paths.envYaml);
		this.globalConfig = loadGlobalConfig();
		this.source = options.source ?? resolveSource(this.topology.source);
		this.repoRoot = this.source.root;
		this.overrides = options.overrides ?? {};
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
		return new RigEnv(this.name, this.paths, { source: this.source, overrides: this.overrides });
	}

	/** The same environment, with overrides that also decide which launchers and runners exist. */
	withOverrides(overrides: Partial<ResolveContext>): RigEnv {
		return new RigEnv(this.name, this.paths, {
			source: this.source,
			overrides: { ...this.overrides, ...overrides },
		});
	}

	context(overrides: Partial<ResolveContext> = {}): ResolveContext {
		return {
			topology: this.topology,
			paths: this.paths,
			repoRoot: this.repoRoot,
			tunnelUrl: this.tunnelUrl(),
			...this.overrides,
			...overrides,
		};
	}

	/** The public HTTPS URL of the tunnel. Read on every call: the tunnel can start or stop at any time. */
	tunnelUrl(): string | undefined {
		return readTunnelUrl(this.paths, this.topology);
	}

	/** The URL of the Mailpit UI, when the environment has `mail: mailpit`. */
	mailUrl(): string | undefined {
		return this.topology.mail.provider === 'mailpit' ? mailpitUrl(this.topology) : undefined;
	}

	processes(): ProcessComponent[] {
		return processComponents(this.topology);
	}

	private offloads = (main: ProcessComponent): boolean => {
		const { env } = resolveEnv(this.context(), main);
		return env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true';
	};

	launchers(): LauncherComponent[] {
		return launcherComponents(this.topology, this.processes(), this.offloads);
	}

	/** Runners that rig runs itself, with `runners.via: direct`. */
	runners(): RunnerComponent[] {
		return runnerComponents(this.topology, this.processes(), this.offloads);
	}

	/**
	 * The components plus the direct runners of each process among them. A
	 * direct runner holds a single-use grant token for the broker of its host,
	 * so it must restart with the host. A launcher gets a new token itself.
	 */
	withDependentRunners(components: Component[]): Component[] {
		const hosts = new Set(components.filter((c) => c.kind === 'process').map((c) => c.name));
		const runners = this.runners().filter((runner) => hosts.has(runner.host.name));
		return [...new Map([...components, ...runners].map((c) => [c.name, c])).values()];
	}

	/** The launchers or direct runners that serve the task brokers of processes. */
	runnerHosts(): RunnerHostComponent[] {
		return [...this.launchers(), ...this.runners()];
	}

	components(): Component[] {
		return [...this.processes(), ...this.launchers(), ...this.runners()];
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
		const env = configuredValues(this.resolve(component, overrides));
		if (component.kind === 'launcher') return hashValues(env, this.launcherConfig(component));
		if (component.kind === 'runner') return hashValues(env, this.repoRoot, component.language);
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

	/** The file of a layer target: a layer in env/, `secrets`, `global-secrets`, or `profile:<name>`. */
	layerFile(layer: string): string {
		if (layer === 'secrets') return this.paths.secrets;
		if (layer === GLOBAL_SECRETS_LAYER) return globalSecretsFile();
		const profile = profileName(layer);
		if (profile) return profileFile(profile);
		return this.paths.layerFile(layer);
	}

	/** A short path of a layer file for messages. */
	layerLabel(layer: string): string {
		const file = this.layerFile(layer);
		return file.startsWith(`${this.paths.root}/`)
			? file.slice(this.paths.root.length + 1)
			: displayPath(file);
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
			if (component.kind === 'runner') targets.add(component.role);
		}
		targets.add('secrets');
		targets.add(GLOBAL_SECRETS_LAYER);
		for (const profile of new Set([...this.topology.profiles, ...listProfiles()])) {
			targets.add(`${PROFILE_PREFIX}${profile}`);
		}
		return [...targets];
	}

	/** Components that a change in a layer file affects. */
	affectedBy(layer: string): Component[] {
		const components = this.components();
		if (layer === 'shared' || layer === 'secrets' || layer === GLOBAL_SECRETS_LAYER) {
			return components;
		}
		const profile = profileName(layer);
		if (profile) return this.topology.profiles.includes(profile) ? components : [];
		for (const runnerLayer of RUNNER_LAYERS) {
			// Launchers pass these layers to all their runners. Direct runners read only their own.
			if (layer === runnerLayer) {
				return components.filter(
					(c) => c.kind === 'launcher' || (c.kind === 'runner' && c.role === runnerLayer),
				);
			}
			if (layer.startsWith(`${runnerLayer}@`)) {
				const host = layer.slice(runnerLayer.length + 1);
				return components.filter(
					(c) =>
						(c.kind === 'launcher' && c.host.name === host) ||
						(c.kind === 'runner' && c.name === layer),
				);
			}
		}
		return components.filter((c) => c.role === layer || c.name === layer);
	}

	hasLayerKey(layer: string, key: string): boolean {
		return readDotenv(this.layerFile(layer)).some((entry) => entry.key === key);
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
