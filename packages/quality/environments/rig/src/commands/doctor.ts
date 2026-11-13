import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { requiredServices, servicePort } from '../config/env-yaml';
import { loadGlobalConfig } from '../config/global-config';
import { RigEnv } from '../environment';
import { RigError } from '../errors';
import {
	type LauncherSource,
	launcherSource,
	releaseBinaryPath,
	releaseMethod,
} from '../launcher/binary';
import { isPortFree, portOwner } from '../runtime/health';
import { liveState } from '../runtime/state';
import { servicesStatus } from '../services/compose';
import { BUILD, RIG, runningVersion } from '../self/build-info';
import { handOffTarget } from '../self/delegate';
import { binDir, currentInstall, isShim, pathStatus, shimPath } from '../self/install';
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

function systemChecks(repoRoot: string | undefined): Check[] {
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

	const docker = version('docker', ['info', '--format', '{{.ServerVersion}}']);
	const compose = version('docker', ['compose', 'version', '--short']);
	if (!version('docker', ['--version'])) {
		checks.push({
			status: 'fail',
			label: 'Docker',
			detail: 'not found',
			hint: 'Install Docker Desktop or OrbStack. Postgres, Redis, and tunnels run in Docker.',
		});
	} else if (!docker) {
		checks.push({
			status: 'fail',
			label: 'Docker',
			detail: 'the daemon is not running',
			hint: 'Start Docker Desktop, OrbStack, or your Docker daemon.',
		});
	} else if (!compose) {
		checks.push({
			status: 'fail',
			label: 'Docker',
			detail: `server ${docker}, no compose plugin`,
			hint: 'Install Docker Compose v2.',
		});
	} else {
		checks.push({ status: 'ok', label: 'Docker', detail: `server ${docker}, compose ${compose}` });
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
		servicesStatus(env.name, env.paths)
			.filter((status) => status.state === 'running')
			.map((status) => status.name),
	);
	for (const service of requiredServices(env.topology)) {
		if (running.has(service)) continue;
		const port = servicePort(env.topology, service);
		if (await isPortFree(port)) continue;
		conflicts.push(`${port} (${service}) is used by ${portOwner(port) ?? 'another process'}`);
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

function installChecks(): Check[] {
	const installed = currentInstall();
	if (!installed) {
		return [
			{
				status: 'info',
				label: 'Global rig',
				detail: `not installed. Run \`${RIG} install-global\``,
			},
		];
	}
	const checks: Check[] = [
		{
			status: 'ok',
			label: 'Global rig',
			detail: `${installed.id}${installed.info ? pc.dim(` (built from ${installed.info.checkout})`) : ''}`,
		},
	];
	const shim = shimPath();
	if (!existsSync(shim) || !isShim(shim)) {
		checks.push({
			status: 'fail',
			label: 'Shim',
			detail: `${shim} is missing`,
			hint: `Run \`${RIG} self-update\`.`,
		});
	}
	const { onPath, first } = pathStatus();
	if (!onPath) {
		checks.push({
			status: 'warn',
			label: 'PATH',
			detail: `${binDir()} is not on PATH`,
			hint: `Add \`export PATH="${binDir()}:$PATH"\` to your shell profile.`,
		});
	} else if (first && !isShim(first)) {
		checks.push({
			status: 'warn',
			label: 'PATH',
			detail: `the shell finds another rig first: ${first}`,
		});
	}
	const handOff = handOffTarget();
	if (BUILD && handOff.kind === 'not-installed') {
		checks.push({
			status: 'warn',
			label: 'Hand-off',
			detail: `${handOff.root} has rig without dependencies`,
			hint: 'Run `pnpm install` there to use its version.',
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
		description: 'Check the tools, the checkout, the launcher, ports, and the global install',
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
		const source = env?.source ?? resolveSource('auto', config.repo);
		const components = env?.components() ?? [];
		const needsLauncher = components.some((c) => c.kind === 'launcher');
		const needsPython =
			needsLauncher && (env?.topology.runners.languages.includes('python') ?? false);

		console.log(`rig ${runningVersion()}`);
		const sections: Array<[string, Check[]]> = [
			['System', systemChecks(source.root)],
			['Source', sourceChecks(source, env)],
			[
				'Task runner launcher',
				launcherChecks(launcherSource(config, source.root), needsLauncher, needsPython),
			],
		];
		if (env) {
			sections.push([`Environment ${env.name}`, await portChecks(env)]);
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
		sections.push(['Global install', installChecks()]);

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
