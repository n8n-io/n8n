import { spawnSync } from 'node:child_process';

import type { RigEnv } from '../environment';
import { requiredServices } from '../config/env-yaml';
import { RigError } from '../errors';
import { userCwd } from '../source';
import type { ProcessComponent } from '../topology/components';
import { ui } from '../ui/output';

export interface SplitPane {
	title: string;
	/** The component that the pane runs. `rig run` also runs its launcher or runners. */
	component: string;
	/** The command, as arguments. Run it without a shell. */
	argv: string[];
	/** The command line, quoted for a shell. */
	command: string;
	cwd: string;
	/** Env vars that the pane needs in addition to the env of the user. */
	env: Record<string, string>;
}

/**
 * The version of the `rig panes --format json` output. Raise it when a field
 * changes its meaning or goes away. New fields do not change the version.
 */
export const PANES_SCHEMA_VERSION = 1;

/** What a terminal multiplexer does to run an environment in panes, like `rig up --split`. */
export interface SplitPlan {
	schemaVersion: typeof PANES_SCHEMA_VERSION;
	env: string;
	/** Run this once, before the panes. It starts the services. Null when there are none. */
	prepare: Omit<SplitPane, 'title' | 'component'> | null;
	panes: SplitPane[];
}

function shellQuote(value: string): string {
	return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function shellCommand(argv: string[]): string {
	return argv.map(shellQuote).join(' ');
}

/** The command that runs this rig again: the same Node flags and entry, so tsx and the bundle both work. */
function rigInvocation(): string[] {
	return [process.execPath, ...process.execArgv, process.argv[1]];
}

/** Env vars that the panes need. A tmux server keeps the env of the shell that started it. */
function paneEnv(): Record<string, string> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (key.startsWith('RIG_') && value !== undefined) env[key] = value;
	}
	env.INIT_CWD = userCwd();
	return env;
}

/** One pane for each n8n process. `rig run` also runs the launcher of the process. */
export function splitPanes(env: RigEnv, extraArgs: string[]): SplitPane[] {
	const cwd = userCwd();
	const vars = paneEnv();
	return env.processes().map((component: ProcessComponent) => {
		const argv = [
			...rigInvocation(),
			'run',
			component.name,
			'--env',
			env.name,
			// The parent started the services. Each pane waits for the processes of the other panes.
			'--no-services',
			'--wait-deps',
			...extraArgs,
		];
		return {
			title: component.name,
			component: component.name,
			argv,
			command: shellCommand(argv),
			cwd,
			env: vars,
		};
	});
}

/** The panes of `rig up --split`, and the command that starts the services first. */
export function splitPlan(env: RigEnv, extraArgs: string[]): SplitPlan {
	const argv = [...rigInvocation(), 'services', 'up', '--env', env.name];
	return {
		schemaVersion: PANES_SCHEMA_VERSION,
		env: env.name,
		prepare:
			requiredServices(env.topology).length > 0
				? { argv, command: shellCommand(argv), cwd: userCwd(), env: paneEnv() }
				: null,
		panes: splitPanes(env, extraArgs),
	};
}

function tmux(args: string[], options: { inherit?: boolean } = {}): string {
	const result = spawnSync('tmux', args, {
		encoding: 'utf8',
		stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
	});
	if (result.error || result.status !== 0) {
		throw new RigError(
			`tmux ${args[0]} failed: ${result.error?.message ?? result.stderr?.trim() ?? ''}`,
		);
	}
	return (result.stdout ?? '').trim();
}

/**
 * Opens one tmux pane for each n8n process. Inside tmux, rig adds a window to
 * the current session. Outside, it creates a session and attaches to it.
 */
export function openSplit(env: RigEnv, panes: SplitPane[]): void {
	if (spawnSync('tmux', ['-V'], { stdio: 'ignore' }).status !== 0) {
		throw new RigError(
			'`rig up --split` needs tmux.',
			'Install tmux, for example `brew install tmux`.',
		);
	}
	const [first, ...rest] = panes;
	const cwd = userCwd();
	const common = [
		'-c',
		cwd,
		...Object.entries(first.env).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
	];
	const insideTmux = Boolean(process.env.TMUX);
	const session = `rig-${env.name}`;

	let window: string;
	if (insideTmux) {
		window = tmux([
			'new-window',
			'-P',
			'-F',
			'#{window_id}',
			'-n',
			`rig:${env.name}`,
			...common,
			first.command,
		]);
	} else {
		if (spawnSync('tmux', ['has-session', '-t', `=${session}`], { stdio: 'ignore' }).status === 0) {
			throw new RigError(
				`The tmux session ${session} exists.`,
				`Attach to it with \`tmux attach -t ${session}\`, or end it with \`tmux kill-session -t ${session}\`.`,
			);
		}
		tmux([
			'new-session',
			'-d',
			'-s',
			session,
			'-n',
			env.name,
			'-x',
			'200',
			'-y',
			'50',
			...common,
			first.command,
		]);
		window = tmux(['display-message', '-p', '-t', session, '#{window_id}']);
	}

	const paneIds = [tmux(['display-message', '-p', '-t', window, '#{pane_id}'])];
	for (const pane of rest) {
		paneIds.push(
			tmux(['split-window', '-P', '-F', '#{pane_id}', '-t', window, ...common, pane.command]),
		);
		// Tiling after each split keeps room for the next one.
		tmux(['select-layout', '-t', window, 'tiled']);
	}
	tmux(['set-option', '-w', '-t', window, 'pane-border-status', 'top']);
	tmux(['set-option', '-w', '-t', window, 'pane-border-format', ' #{pane_title} ']);
	panes.forEach((pane, index) => tmux(['select-pane', '-t', paneIds[index], '-T', pane.title]));
	tmux(['select-pane', '-t', paneIds[0]]);

	if (insideTmux) {
		ui.success(`Opened the window rig:${env.name} with ${panes.length} panes.`);
		return;
	}
	ui.info(`Attaching to the tmux session ${session}. Ctrl+C in a pane stops its components.`);
	tmux(['attach-session', '-t', session], { inherit: true });
}
