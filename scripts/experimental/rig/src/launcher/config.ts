import { chmodSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { Language } from '../config/env-yaml';
import { JS_RUNNER_DIR, PY_RUNNER_DIR } from '../source';
import type { LauncherComponent } from '../topology/components';

/** Same lists as `docker/images/runners/n8n-task-runners.json`. */
const JS_ALLOWED_ENV = [
	'PATH',
	'GENERIC_TIMEZONE',
	'NODE_OPTIONS',
	'NODE_PATH',
	'N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT',
	'N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT',
	'N8N_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN',
	'N8N_RUNNERS_TASK_TIMEOUT',
	'N8N_RUNNERS_MAX_CONCURRENCY',
	'N8N_SENTRY_DSN',
	'N8N_VERSION',
	'ENVIRONMENT',
	'DEPLOYMENT_NAME',
	'HOME',
];

const PY_ALLOWED_ENV = [
	'PATH',
	'N8N_RUNNERS_LAUNCHER_LOG_LEVEL',
	'N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT',
	'N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT',
	'N8N_RUNNERS_TASK_TIMEOUT',
	'N8N_RUNNERS_MAX_CONCURRENCY',
	'N8N_SENTRY_DSN',
	'N8N_VERSION',
	'ENVIRONMENT',
	'DEPLOYMENT_NAME',
	'HOME',
];

/** Keys that a runner gets from the env of its launcher. */
export const RUNNER_ALLOWED_ENV: Record<Language, readonly string[]> = {
	js: JS_ALLOWED_ENV,
	python: PY_ALLOWED_ENV,
};

export interface LauncherRunnerConfig {
	'runner-type': 'javascript' | 'python';
	workdir: string;
	command: string;
	args: string[];
	'health-check-server-port': string;
	'allowed-env': string[];
	'env-overrides': Record<string, string>;
}

export interface LauncherConfig {
	'task-runners': LauncherRunnerConfig[];
}

export const RUNNER_TYPES: Record<Language, 'javascript' | 'python'> = {
	js: 'javascript',
	python: 'python',
};

/** The real path of the Node binary. Version manager shims belong to one shell session. */
export function nodeBinary(): string {
	return realpathSync(process.execPath);
}

/** How to start a runner. The launcher config and direct runners use the same command. */
export function runnerCommand(
	language: Language,
	repoRoot: string,
): { command: string; args: string[]; cwd: string } {
	if (language === 'js') {
		const cwd = join(repoRoot, JS_RUNNER_DIR);
		return {
			command: nodeBinary(),
			args: [
				'--disallow-code-generation-from-strings',
				'--disable-proto=delete',
				'--no-experimental-webstorage',
				join(cwd, 'dist/start.js'),
			],
			cwd,
		};
	}
	const cwd = join(repoRoot, PY_RUNNER_DIR);
	return { command: 'uv', args: ['--directory', cwd, 'run', 'python', 'src/main.py'], cwd };
}

export function buildLauncherConfig(options: {
	component: LauncherComponent;
	repoRoot: string;
	languages: Language[];
	overrides: Record<Language, Record<string, string>>;
}): LauncherConfig {
	const { component, repoRoot, languages, overrides } = options;
	const { ports } = component.host;
	const runners: LauncherRunnerConfig[] = [];

	if (languages.includes('js')) {
		const { command, args, cwd } = runnerCommand('js', repoRoot);
		runners.push({
			'runner-type': 'javascript',
			workdir: cwd,
			command,
			args,
			'health-check-server-port': String(ports.jsHealth),
			'allowed-env': JS_ALLOWED_ENV,
			'env-overrides': overrides.js,
		});
	}

	if (languages.includes('python')) {
		const { command, args, cwd } = runnerCommand('python', repoRoot);
		runners.push({
			'runner-type': 'python',
			workdir: cwd,
			command,
			args,
			'health-check-server-port': String(ports.pyHealth),
			'allowed-env': PY_ALLOWED_ENV,
			'env-overrides': overrides.python,
		});
	}

	return { 'task-runners': runners };
}

export function writeLauncherConfig(file: string, config: LauncherConfig): void {
	mkdirSync(dirname(file), { recursive: true });
	// The launcher reads the runner env only from this file, so it can hold decrypted secrets.
	writeFileSync(file, `${JSON.stringify(config, null, '\t')}\n`, { mode: 0o600 });
	chmodSync(file, 0o600);
}
