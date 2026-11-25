import { spawnSync } from 'node:child_process';
import pc from 'picocolors';

import {
	type ContainerRuntime,
	CONTAINER_RUNTIMES,
	loadGlobalConfig,
	saveGlobalConfig,
	setGlobalConfigValue,
} from '../config/global-config';
import { RigError } from '../errors';
import { RIG } from '../meta';
import { ui } from '../ui/output';
import { isInteractive, select } from '../ui/prompt';

export type { ContainerRuntime };

/** `RIG_CONTAINER_RUNTIME` wins over `container.runtime` in the global config. */
export const RUNTIME_ENV_VAR = 'RIG_CONTAINER_RUNTIME';

const LABELS: Record<ContainerRuntime, string> = { docker: 'Docker', podman: 'Podman' };

export function runtimeLabel(runtime: ContainerRuntime): string {
	return LABELS[runtime];
}

function isRuntime(value: string | undefined): value is ContainerRuntime {
	return value !== undefined && (CONTAINER_RUNTIMES as readonly string[]).includes(value);
}

/** Whether the CLI is on `PATH`. */
export function isInstalled(runtime: ContainerRuntime): boolean {
	return spawnSync(runtime, ['--version'], { stdio: 'ignore' }).status === 0;
}

/** The server version, or undefined when the daemon (Docker) or the machine (Podman) does not run. */
export function serverVersion(runtime: ContainerRuntime): string | undefined {
	const format = runtime === 'docker' ? '{{.ServerVersion}}' : '{{.Version.Version}}';
	const result = spawnSync(runtime, ['info', '--format', format], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	});
	return result.status === 0 ? result.stdout.trim() || 'unknown' : undefined;
}

/** The runtime from `RIG_CONTAINER_RUNTIME` or the global config. Throws on an unknown value. */
export function configuredRuntime(): ContainerRuntime | undefined {
	const fromEnv = process.env[RUNTIME_ENV_VAR];
	if (fromEnv) {
		if (!isRuntime(fromEnv)) {
			throw new RigError(
				`${RUNTIME_ENV_VAR}=${fromEnv} is not a container runtime.`,
				'Use docker or podman.',
			);
		}
		return fromEnv;
	}
	return loadGlobalConfig().container.runtime;
}

function save(runtime: ContainerRuntime): void {
	saveGlobalConfig(setGlobalConfigValue(loadGlobalConfig(), 'container.runtime', runtime));
}

/** Prefers a runtime that runs now, then Docker. */
function pick(installed: ContainerRuntime[]): ContainerRuntime {
	return installed.find((runtime) => serverVersion(runtime) !== undefined) ?? installed[0];
}

function noRuntimeError(): RigError {
	return new RigError(
		'rig needs Docker or Podman for Postgres, Redis, tunnels, and Mailpit.',
		'Install Docker Desktop, OrbStack, or Podman (https://podman.io), then run rig again.',
	);
}

/**
 * The runtime to use, without a question. Without a setting it picks an
 * installed one and does not save it.
 */
export function containerRuntime(): ContainerRuntime {
	const configured = configuredRuntime();
	if (configured) return configured;
	const installed = CONTAINER_RUNTIMES.filter(isInstalled);
	if (installed.length === 0) throw noRuntimeError();
	return pick(installed);
}

/**
 * The runtime to use. The first time, it checks which runtimes are installed.
 * With one, it saves that one. With both, it asks in a terminal and saves the
 * answer.
 */
export async function ensureContainerRuntime(): Promise<ContainerRuntime> {
	const configured = configuredRuntime();
	if (configured) return configured;

	const installed = CONTAINER_RUNTIMES.filter(isInstalled);
	if (installed.length === 0) throw noRuntimeError();
	const change = `Change it with \`${RIG} config set container.runtime <docker|podman>\`.`;

	if (installed.length === 1) {
		const [runtime] = installed;
		save(runtime);
		ui.info(`Using ${runtimeLabel(runtime)} for containers. ${pc.dim(change)}`);
		return runtime;
	}
	if (!isInteractive()) {
		const runtime = pick(installed);
		ui.info(
			`Docker and Podman are installed. Using ${runtimeLabel(runtime)} this time. ${pc.dim(change)}`,
		);
		return runtime;
	}
	const runtime = await select<ContainerRuntime>(
		'Docker and Podman are installed. Which one should rig use for containers?',
		installed.map((value) => ({
			value,
			label: runtimeLabel(value),
			hint: serverVersion(value) ? 'running' : 'not running',
		})),
		pick(installed),
	);
	save(runtime);
	ui.success(`Saved: rig uses ${runtimeLabel(runtime)}. ${pc.dim(change)}`);
	return runtime;
}

/** Throws with a hint when the runtime does not run. */
export function assertRuntimeRunning(runtime: ContainerRuntime): void {
	if (serverVersion(runtime) !== undefined) return;
	if (!isInstalled(runtime)) {
		throw new RigError(
			`${runtimeLabel(runtime)} is not installed.`,
			`Install it, or change the runtime with \`${RIG} config set container.runtime <docker|podman>\`.`,
		);
	}
	throw new RigError(
		`${runtimeLabel(runtime)} is not running.`,
		runtime === 'docker'
			? 'Start Docker Desktop, OrbStack, or your Docker daemon.'
			: 'Start the Podman machine with `podman machine start` (macOS and Windows), or the Podman service.',
	);
}
