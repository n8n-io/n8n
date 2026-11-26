import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { requiredServices, servicePorts } from '../config/env-yaml';
import { CONTAINER_RUNTIMES, loadGlobalConfig } from '../config/global-config';
import { displayPath } from '../config/paths';
import { RigEnv } from '../environment';
import {
	inspectSecrets,
	keyFileHint,
	keyFileWarning,
	keyStoreLabel,
	SECRETS_BACKEND_ENV_VAR,
	type SecretsReport,
} from '../env/secret-store';
import type { LayerKind } from '../env/resolve';
import { GENERATED_SECRET_KEYS } from '../env/secrets';
import { RigError } from '../errors';
import {
	type LauncherSource,
	launcherSource,
	releaseBinaryPath,
	releaseMethod,
} from '../launcher/binary';
import { isPortFree, portOwner } from '../runtime/health';
import { liveState } from '../runtime/state';
import { browserLabel, installedBrowsers } from '../integrations/browser';
import { editorLabel, installedEditors } from '../integrations/editor';
import { servicesStatus } from '../services/compose';
import {
	type ContainerRuntime,
	configuredRuntime,
	containerRuntime,
	isInstalled,
	RUNTIME_ENV_VAR,
	runtimeLabel,
	serverVersion,
} from '../services/runtime';
import { RIG, runningVersion } from '../meta';
import { checkBuild, CLI_DIR, type ResolvedSource, resolveSource } from '../source';
import { portsOf } from '../topology/components';
import { ui } from '../ui/output';
import { envArg } from './common';

type Status = 'ok' | 'warn' | 'fail' | 'info';

interface Check {
	status: Status;
	label: string;
	detail: string;
	hint?: string;
}

const SYMBOLS: Record<Status, string> = {
	ok: pc.green('✔'),
	warn: pc.yellow('!'),
	fail: pc.red('✖'),
	info: pc.dim('·'),
};

function version(command: string, args: string[]): string | undefined {
	const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	if (result.error || result.status !== 0) return undefined;
	return `${result.stdout}${result.stderr}`.trim().split('\n')[0];
}

/** The minimum Node version of a `>=x.y.z` range, as numbers. Other ranges are not checked. */
function minimumNode(range: string): number[] | undefined {
	const match = /^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range.trim());
	return match ? [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)] : undefined;
}

function nodeCheck(repoRoot: string | undefined): Check {
	const current = process.versions.node.split('.').map(Number);
	let range: string | undefined;
	if (repoRoot) {
		try {
			const parsed: unknown = JSON.parse(
				readFileSync(join(repoRoot, CLI_DIR, 'package.json'), 'utf8'),
			);
			if (typeof parsed === 'object' && parsed !== null && 'engines' in parsed) {
				const engines = parsed.engines;
				if (typeof engines === 'object' && engines !== null && 'node' in engines) {
					range = String(engines.node);
				}
			}
		} catch {
			// The check below reports the version without a range.
		}
	}
	const minimum = range ? minimumNode(range) : undefined;
	if (!minimum) return { status: 'ok', label: 'Node', detail: process.version };
	const difference = minimum
		.map((part, index) => (current[index] ?? 0) - part)
		.find((value) => value !== 0);
	const tooOld = difference !== undefined && difference < 0;
	return tooOld
		? {
				status: 'fail',
				label: 'Node',
				detail: `${process.version}, n8n needs ${range}`,
				hint: 'Switch the Node version, for example with `nvm use` or `fnm use`.',
			}
		: { status: 'ok', label: 'Node', detail: `${process.version} (n8n needs ${range})` };
}

function systemChecks(repoRoot: string | undefined, needsContainers: boolean): Check[] {
	const checks = [nodeCheck(repoRoot)];

	const pnpm = version('pnpm', ['--version']);
	checks.push(
		pnpm
			? { status: 'ok', label: 'pnpm', detail: pnpm }
			: {
					status: 'warn',
					label: 'pnpm',
					detail: 'not found',
					hint: 'pnpm builds the checkout: https://pnpm.io/installation',
				},
	);

	checks.push(...runtimeChecks(needsContainers));
	return checks;
}

function runtimeChecks(needsContainers: boolean): Check[] {
	let configured: ContainerRuntime | undefined;
	try {
		configured = configuredRuntime();
	} catch (error) {
		return [
			{
				status: 'fail',
				label: 'Containers',
				detail: error instanceof Error ? error.message : String(error),
			},
		];
	}
	const installed = CONTAINER_RUNTIMES.filter(isInstalled);
	const selected = configured ?? (installed.length > 0 ? containerRuntime() : undefined);
	const missing: Status = needsContainers ? 'fail' : 'warn';
	const checks: Check[] = [
		{
			status: selected ? 'ok' : missing,
			label: 'Containers',
			detail: configured
				? `${runtimeLabel(configured)} ${pc.dim(process.env[RUNTIME_ENV_VAR] ? `(${RUNTIME_ENV_VAR})` : '(container.runtime)')}`
				: selected
					? `${runtimeLabel(selected)} ${pc.dim('(not saved yet: rig asks or saves on the first use)')}`
					: 'neither Docker nor Podman is installed',
			hint: selected
				? undefined
				: 'Install Docker Desktop, OrbStack, or Podman. Postgres, Redis, tunnels, and Mailpit run in containers.',
		},
	];
	for (const runtime of CONTAINER_RUNTIMES) {
		const label = runtimeLabel(runtime);
		const used = runtime === selected;
		// A runtime that rig does not use is information only.
		const problem: Status = used ? missing : 'info';
		if (!installed.includes(runtime)) {
			if (used)
				checks.push({
					status: missing,
					label,
					detail: 'not found',
					hint: `Install ${label}, or run \`${RIG} config set container.runtime <docker|podman>\`.`,
				});
			continue;
		}
		const server = serverVersion(runtime);
		const compose = version(runtime, ['compose', 'version']);
		if (!server) {
			checks.push({
				status: problem,
				label,
				detail: 'installed, not running',
				hint: used
					? runtime === 'docker'
						? 'Start Docker Desktop, OrbStack, or your Docker daemon.'
						: 'Run `podman machine start`.'
					: undefined,
			});
		} else if (!compose) {
			checks.push({
				status: problem,
				label,
				detail: `server ${server}, no compose`,
				hint: used
					? runtime === 'docker'
						? 'Install Docker Compose v2.'
						: '`podman compose` needs docker-compose or podman-compose on PATH.'
					: undefined,
			});
		} else {
			checks.push({
				status: used ? 'ok' : 'info',
				label,
				detail: `server ${server}, ${compose.replace(/^.*version\s*/i, 'compose ')}`,
			});
		}
	}
	return checks;
}

function sourceChecks(source: ResolvedSource, env: RigEnv | undefined): Check[] {
	if (!source.root) {
		return [
			{
				status: 'fail',
				label: 'Checkout',
				detail: source.problem?.message ?? 'not found',
				hint: source.problem?.hint,
			},
		];
	}
	const checks: Check[] = [
		{
			status: 'ok',
			label: 'Checkout',
			detail: `${source.root} ${pc.dim(`(from the ${source.origin})`)}`,
		},
	];
	const languages = env?.topology.runners.languages ?? ['js'];
	const external = env ? env.topology.runners.mode === 'external' : true;
	const build = checkBuild(source.root, {
		jsRunner: external && languages.includes('js'),
		pyRunner: external && languages.includes('python'),
	});
	for (const error of build.errors) checks.push({ status: 'fail', label: 'Build', detail: error });
	for (const warning of build.warnings)
		checks.push({ status: 'warn', label: 'Build', detail: warning });
	if (build.errors.length === 0 && build.warnings.length === 0) {
		checks.push({ status: 'ok', label: 'Build', detail: `${CLI_DIR}/dist exists` });
	}
	return checks;
}

function launcherChecks(
	source: LauncherSource,
	needsLauncher: boolean,
	needsPython: boolean,
): Check[] {
	const checks: Check[] = [];
	const go = version('go', ['version']);
	// Without an environment, the launcher is likely needed: external runners are the default.
	const missing: Status = needsLauncher ? 'fail' : 'warn';

	if (source.kind === 'checkout') {
		const hasCheckout = existsSync(join(source.path, 'go.mod'));
		checks.push(
			hasCheckout
				? { status: 'ok', label: 'Launcher', detail: `checkout ${source.path}` }
				: {
						status: missing,
						label: 'Launcher',
						detail: `${source.path} is not a launcher checkout`,
						hint: `Run \`${RIG} config set launcher.path <checkout>\`, or \`${RIG} config unset launcher.path\` to use a release.`,
					},
		);
		checks.push(
			go
				? { status: 'ok', label: 'Go', detail: go.replace(/^go version /, '') }
				: {
						status: missing,
						label: 'Go',
						detail: 'not found',
						hint: 'A launcher checkout needs Go: https://go.dev/dl/',
					},
		);
	} else {
		const label = `release ${source.version} ${pc.dim(`(from the ${source.versionFrom})`)}`;
		const binary = releaseBinaryPath(source.version);
		if (existsSync(binary)) {
			checks.push({ status: 'ok', label: 'Launcher', detail: `${label}, cached` });
		} else if (releaseMethod() === 'download') {
			checks.push({
				status: 'info',
				label: 'Launcher',
				detail: `${label}, downloads on the first start`,
			});
		} else {
			checks.push({
				status: 'info',
				label: 'Launcher',
				detail: `${label}, builds from source with Go on the first start`,
			});
			checks.push(
				go
					? { status: 'ok', label: 'Go', detail: go.replace(/^go version /, '') }
					: {
							status: missing,
							label: 'Go',
							detail: 'not found',
							hint: 'Release builds exist only for Linux, so rig builds the launcher with Go here. Install Go: https://go.dev/dl/',
						},
			);
		}
	}

	const uv = version('uv', ['--version']);
	checks.push(
		uv
			? { status: 'ok', label: 'uv', detail: uv.replace(/^uv /, '') }
			: {
					status: needsPython ? 'fail' : 'info',
					label: 'uv',
					detail: needsPython ? 'not found' : 'not found, only the Python runner needs it',
					hint: needsPython ? 'Install uv: https://docs.astral.sh/uv/' : undefined,
				},
	);
	return checks;
}

async function portChecks(env: RigEnv): Promise<Check[]> {
	const checks: Check[] = [];
	const conflicts: string[] = [];
	for (const component of env.components()) {
		if (liveState(env.paths, component.name)) continue;
		for (const port of portsOf(component, env.topology)) {
			if (await isPortFree(port)) continue;
			conflicts.push(
				`${port} (${component.name}) is used by ${portOwner(port) ?? 'another process'}`,
			);
		}
	}
	const running = new Set(
		servicesStatus(env.name, env.topology)
			.filter((status) => status.state === 'running')
			.map((status) => status.name),
	);
	for (const service of requiredServices(env.topology)) {
		if (running.has(service)) continue;
		for (const port of servicePorts(env.topology, service)) {
			if (await isPortFree(port)) continue;
			conflicts.push(`${port} (${service}) is used by ${portOwner(port) ?? 'another process'}`);
		}
	}
	if (conflicts.length === 0) {
		checks.push({ status: 'ok', label: 'Ports', detail: 'free, or used by this environment' });
	}
	for (const conflict of conflicts) {
		checks.push({
			status: 'fail',
			label: 'Ports',
			detail: conflict,
			hint: `Stop that process, or the environment that uses it: \`${RIG} stop --env <name>\`.`,
		});
	}
	return checks;
}

/**
 * Values of secrets.env that a more specific layer overrides. Before the
 * secrets moved below the other layers, secrets.env won. So an environment
 * from an older rig can run with another value now, for example another
 * N8N_ENCRYPTION_KEY.
 */
const OVERRIDING_LAYERS = new Set<LayerKind>(['shared', 'role', 'component']);

export function secretOverrideChecks(env: RigEnv): Check[] {
	const overrides = new Map<string, Check>();
	try {
		for (const component of env.components()) {
			for (const [key, sources] of env.resolve(component).trace) {
				const secret = sources
					.filter((source) => source.layer === 'secrets' && source.label.startsWith('secrets.env:'))
					.at(-1);
				const winner = sources.at(-1);
				if (!secret || !winner || winner === secret || winner.value === secret.value) continue;
				// Only a layer file can override secrets.env. rig adds `engine-v2` to N8N_ENABLED_MODULES after the merge.
				if (!OVERRIDING_LAYERS.has(winner.layer)) continue;
				overrides.set(`${key} ${winner.label}`, {
					status: 'warn',
					label: 'Secrets',
					detail: `${key} in ${winner.label} overrides ${secret.label}`,
					hint: GENERATED_SECRET_KEYS.includes(key)
						? `rig generated ${key}. Remove it from ${winner.label} unless you want this value.`
						: `Layers win over secrets.env. Remove ${key} from ${winner.label} to use the value of secrets.env.`,
				});
			}
		}
	} catch {
		// The "Secrets encryption" section reports a key that rig cannot read.
		return [];
	}
	return [...overrides.values()];
}

function toolChecks(): Check[] {
	const { browser, editor } = loadGlobalConfig();
	const browsers = installedBrowsers().map((b) => b.label);
	const editors = installedEditors().map((e) => e.label);
	const found = (names: string[]) =>
		names.length > 0 ? `found: ${names.join(', ')}` : 'none found';
	return [
		{
			status: 'info',
			label: 'Browser',
			detail: browser
				? `${browserLabel(browser)} ${pc.dim('(browser)')}`
				: `asks on the first URL · ${found(browsers)}`,
		},
		{
			status: 'info',
			label: 'Editor',
			detail: editor
				? `${editorLabel(editor)} ${pc.dim('(editor)')}`
				: `asks on the first edit · ${found(editors)}`,
		},
	];
}

export function secretsChecks(): Check[] {
	let report: SecretsReport;
	try {
		report = inspectSecrets();
	} catch (error) {
		return [
			{
				status: 'fail',
				label: 'Backend',
				detail: error instanceof Error ? error.message : String(error),
			},
		];
	}
	const { backend, from } = report.choice;
	const checks: Check[] = [];
	if (backend === 'off') {
		checks.push({
			status: 'warn',
			label: 'Backend',
			detail: 'off, secrets are in plaintext',
			hint: `Run \`${RIG} secrets use <backend>\`.`,
		});
	} else if (!report.available || report.problem) {
		checks.push({
			status: 'fail',
			label: 'Backend',
			detail: report.problem ?? `${keyStoreLabel(backend)} is not available`,
			hint: `Run \`${RIG} secrets use <backend>\` to move to a backend that works here.`,
		});
	} else if (backend === 'file') {
		checks.push({
			status: 'warn',
			label: 'Backend',
			detail: keyFileWarning(),
			hint: keyFileHint(),
		});
	} else {
		checks.push({
			status: 'ok',
			label: 'Backend',
			detail: `${keyStoreLabel(backend)} ${pc.dim(from === 'detected' ? '(saved on the first use)' : `(${from === 'env' ? SECRETS_BACKEND_ENV_VAR : 'secrets.backend'})`)}`,
		});
	}
	const unreadable = report.files.filter((file) => file.unreadable > 0);
	for (const file of unreadable) {
		checks.push({
			status: 'fail',
			label: 'Secrets',
			detail: `${file.unreadable} value(s) in ${displayPath(file.file)} cannot be decrypted`,
			hint: `Import the right key with \`${RIG} secrets import-key\`.`,
		});
	}
	// With encryption off, the backend check above already warns about plaintext.
	const plaintext = backend === 'off' ? [] : report.files.filter((file) => file.plaintext > 0);
	for (const file of plaintext) {
		checks.push({
			status: 'warn',
			label: 'Secrets',
			detail: `${file.plaintext} value(s) in ${displayPath(file.file)} are in plaintext`,
			hint: `Run \`${RIG} secrets encrypt\`. rig also encrypts them the next time it reads the file.`,
		});
	}
	if (unreadable.length === 0 && plaintext.length === 0 && report.files.length > 0) {
		const encrypted = report.files.reduce((sum, file) => sum + file.encrypted, 0);
		checks.push({
			status: 'ok',
			label: 'Secrets',
			detail: `${encrypted} encrypted value(s) in ${report.files.length} file(s)`,
		});
	}
	return checks;
}

function printSection(title: string, checks: Check[]): void {
	console.log(`\n${pc.bold(title)}`);
	const width = Math.max(...checks.map((check) => check.label.length));
	for (const check of checks) {
		console.log(`  ${SYMBOLS[check.status]} ${check.label.padEnd(width)}  ${check.detail}`);
		if (check.hint && check.status !== 'ok')
			console.log(pc.dim(`    ${' '.repeat(width)}  ${check.hint}`));
	}
}

export const doctorCommand = defineCommand({
	meta: {
		name: 'doctor',
		description: 'Check the tools, the checkout, the launcher, ports, and secrets encryption',
	},
	args: { ...envArg },
	async run({ args }) {
		let env: RigEnv | undefined;
		let envProblem: string | undefined;
		try {
			env = RigEnv.load(typeof args.env === 'string' ? args.env : undefined);
		} catch (error) {
			envProblem = error instanceof RigError ? error.message : String(error);
		}
		const config = loadGlobalConfig();
		const source = env?.source ?? resolveSource('auto');
		const components = env?.components() ?? [];
		const needsLauncher = components.some((c) => c.kind === 'launcher');
		// Without an environment, containers are likely needed.
		const needsContainers = env ? requiredServices(env.topology).length > 0 : true;
		const needsPython =
			(needsLauncher && (env?.topology.runners.languages.includes('python') ?? false)) ||
			components.some((c) => c.kind === 'runner' && c.language === 'python');

		console.log(`rig ${runningVersion()}`);
		const sections: Array<[string, Check[]]> = [
			['System', systemChecks(source.root, needsContainers)],
			['Source', sourceChecks(source, env)],
			[
				'Task runner launcher',
				launcherChecks(launcherSource(config, source.root), needsLauncher, needsPython),
			],
		];
		if (env) {
			sections.push([
				`Environment ${env.name}`,
				[...(await portChecks(env)), ...secretOverrideChecks(env)],
			]);
		} else {
			sections.push([
				'Environment',
				[
					{
						status: 'info',
						label: 'Environment',
						detail: `${envProblem ?? 'none selected'} The port check needs one.`,
					},
				],
			]);
		}
		sections.push(['Secrets encryption', secretsChecks()]);
		sections.push(['Browser and editor', toolChecks()]);

		for (const [title, checks] of sections) printSection(title, checks);

		const all = sections.flatMap(([, checks]) => checks);
		const failures = all.filter((check) => check.status === 'fail').length;
		const warnings = all.filter((check) => check.status === 'warn').length;
		console.log('');
		if (failures > 0) {
			ui.error(
				`${failures} problem${failures === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`,
			);
			process.exitCode = 1;
		} else if (warnings > 0) {
			ui.warn(`No problems, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
		} else {
			ui.success('No problems.');
		}
	},
});
