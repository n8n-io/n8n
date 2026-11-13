import { type ChildProcess, spawn } from 'node:child_process';
import { closeSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sleep } from '@n8n/utils/sleep';
import pc from 'picocolors';

import type { RigEnv } from '../environment';
import type { ResolveContext } from '../env/resolve';
import { RigError } from '../errors';
import { ensureLauncherBinary } from '../launcher/binary';
import { nodeBinary, writeLauncherConfig } from '../launcher/config';
import { CLI_DIR } from '../source';
import { type Component, portsOf, type ProcessComponent } from '../topology/components';
import type { PrefixPrinter } from '../ui/output';
import { isPortFree, isReady, portOwner, readinessUrl, waitUntilReady } from './health';
import { LogFollower, openNewLog } from './logs';
import {
	clearState,
	type ComponentState,
	currentTty,
	isPidAlive,
	liveState,
	processStartTime,
	writeState,
} from './state';
import { RIG } from '../self/build-info';

/** Who owns a started component. */
export type Owner = 'self' | 'background' | { pid: number | null; tty: string | null };

const N8N_SUBCOMMANDS: Record<ProcessComponent['role'], string> = {
	main: 'start',
	worker: 'worker',
	engine: 'engine',
};

const READY_TIMEOUT_MS: Record<Component['role'], number> = {
	main: 10 * 60_000,
	worker: 5 * 60_000,
	engine: 5 * 60_000,
	launcher: 2 * 60_000,
};

interface Command {
	command: string;
	args: string[];
	cwd: string;
}

export interface SupervisorOptions {
	env: RigEnv;
	printer: PrefixPrinter;
	/** Overrides for `rig run -e` and `--inherit-env`. */
	resolveOverrides?: Partial<ResolveContext>;
}

export class Supervisor {
	env: RigEnv;
	private readonly printer: PrefixPrinter;
	private readonly resolveOverrides: Partial<ResolveContext>;
	private readonly children = new Map<number, ChildProcess>();
	private readonly exitCodes = new Map<number, string>();
	private readonly followers = new Map<string, LogFollower>();
	private readonly stopping = new Set<string>();
	private readonly tty = currentTty();

	constructor(options: SupervisorOptions) {
		this.env = options.env;
		this.printer = options.printer;
		this.resolveOverrides = options.resolveOverrides ?? {};
	}

	setEnv(env: RigEnv): void {
		this.env = env;
	}

	hash(component: Component): string {
		return this.env.componentHash(component, this.resolveOverrides);
	}

	private async command(component: Component, repoRoot: string): Promise<Command> {
		if (component.kind === 'launcher') {
			const binary = await ensureLauncherBinary(this.env.launcherSource(), (message) =>
				this.printer.event(component.name, message),
			);
			const runnerTypes = this.env.topology.runners.languages.map((language) =>
				language === 'js' ? 'javascript' : 'python',
			);
			return { command: binary, args: runnerTypes, cwd: this.env.paths.root };
		}
		const subcommand = N8N_SUBCOMMANDS[component.role];
		return {
			command: nodeBinary(),
			args: ['bin/n8n', subcommand],
			cwd: join(repoRoot, CLI_DIR),
		};
	}

	private async assertPortsFree(component: Component): Promise<void> {
		for (const port of portsOf(component, this.env.topology)) {
			if (await isPortFree(port)) continue;
			const owner = portOwner(port);
			throw new RigError(
				`Port ${port} of ${component.name} is in use${owner ? ` by ${owner}` : ''}.`,
				`Stop that process, or stop the other environment with \`${RIG} stop --env <name>\`.`,
			);
		}
	}

	/** Starts a component. Returns the pid. */
	async start(component: Component, owner: Owner): Promise<number> {
		const running = liveState(this.env.paths, component.name);
		if (running) {
			throw new RigError(
				`${component.name} is already running (pid ${running.pid}${running.ownerTty ? `, in ${running.ownerTty}` : ''}).`,
				`Use \`${RIG} restart ${component.name}\` or \`${RIG} stop ${component.name}\`.`,
			);
		}

		const repoRoot = this.env.requireRepoRoot();
		await this.assertPortsFree(component);
		const { env } = this.env.resolve(component, this.resolveOverrides);
		const command = await this.command(component, repoRoot);

		if (component.kind === 'launcher') {
			writeLauncherConfig(
				this.env.paths.launcherConfig(component.host.name),
				this.env.launcherConfig(component),
			);
		} else {
			mkdirSync(this.env.paths.userFolder(component.name), { recursive: true });
		}

		const logFd = openNewLog(
			this.env.paths.log(component.name),
			this.env.paths.previousLog(component.name),
			pc.dim(`── rig: ${component.name} starting at ${new Date().toLocaleTimeString()} ──`),
		);
		let child: ChildProcess;
		try {
			// A separate process group, so a stop also reaches runners and other children.
			child = spawn(command.command, command.args, {
				cwd: command.cwd,
				env,
				detached: true,
				stdio: ['ignore', logFd, logFd],
			});
		} finally {
			closeSync(logFd);
		}

		const pid = await new Promise<number>((resolve, reject) => {
			child.once('error', (error) =>
				reject(new RigError(`Cannot start ${component.name}: ${error.message}`)),
			);
			child.once('spawn', () => {
				if (child.pid === undefined) reject(new RigError(`Cannot start ${component.name}.`));
				else resolve(child.pid);
			});
		});

		const ownerPid = owner === 'self' ? process.pid : owner === 'background' ? null : owner.pid;
		const ownerTty = owner === 'self' ? this.tty : owner === 'background' ? null : owner.tty;
		const state: ComponentState = {
			component: component.name,
			pid,
			ownerPid,
			ownerTty,
			startedAt: new Date().toISOString(),
			envHash: this.hash(component),
			ports: portsOf(component, this.env.topology),
			processStart: processStartTime(pid),
			source: repoRoot,
		};
		writeState(this.env.paths, state);

		this.children.set(pid, child);
		child.once('exit', (code, signal) => {
			this.children.delete(pid);
			this.exitCodes.set(pid, signal ? signal : `code ${code}`);
			clearState(this.env.paths, component.name, pid);
		});
		if (owner !== 'self') child.unref();

		return pid;
	}

	async waitReady(component: Component, pid: number, signal?: AbortSignal) {
		const { env } = this.env.resolve(component, this.resolveOverrides);
		return await waitUntilReady({
			url: readinessUrl(component, env.N8N_ENDPOINT_HEALTH),
			isRunning: () => isPidAlive(pid),
			timeoutMs: READY_TIMEOUT_MS[component.role],
			signal,
		});
	}

	async isComponentReady(component: Component): Promise<boolean> {
		const { env } = this.env.resolve(component, this.resolveOverrides);
		return await isReady(readinessUrl(component, env.N8N_ENDPOINT_HEALTH));
	}

	/** Stops a component, whoever owns it. Returns false when it was not running. */
	async stop(component: Component): Promise<boolean> {
		const state = liveState(this.env.paths, component.name);
		if (!state) return false;
		this.stopping.add(component.name);
		try {
			const { env } = this.env.resolve(component, this.resolveOverrides);
			const graceMs = (shutdownSeconds(component, env) + 5) * 1000;
			signalGroup(state.pid, 'SIGTERM');
			const deadline = Date.now() + graceMs;
			while (isPidAlive(state.pid) && Date.now() < deadline) {
				await sleep(100);
			}
			if (isPidAlive(state.pid)) signalGroup(state.pid, 'SIGKILL');
			while (isPidAlive(state.pid)) await sleep(50);
			// The launcher's runners are in its group. Make sure they are gone too.
			signalGroup(state.pid, 'SIGKILL', false);
			clearState(this.env.paths, component.name, state.pid);
			return true;
		} finally {
			this.stopping.delete(component.name);
		}
	}

	/** Stops and starts a component. The new process keeps the owner of the old one. */
	async restart(component: Component, owner?: Owner): Promise<number> {
		const previous = liveState(this.env.paths, component.name);
		await this.stop(component);
		const keepOwner: Owner =
			owner ??
			(previous?.ownerPid === process.pid
				? 'self'
				: previous?.ownerPid && isPidAlive(previous.ownerPid)
					? { pid: previous.ownerPid, tty: previous.ownerTty }
					: 'background');
		return await this.start(component, keepOwner);
	}

	/** Makes this process the owner of a component that has no live owner. */
	adopt(state: ComponentState): void {
		if (state.ownerPid === process.pid) return;
		if (state.ownerPid !== null && isPidAlive(state.ownerPid)) return;
		writeState(this.env.paths, { ...state, ownerPid: process.pid, ownerTty: this.tty });
	}

	isStopping(name: string): boolean {
		return this.stopping.has(name);
	}

	exitReason(pid: number): string | undefined {
		return this.exitCodes.get(pid);
	}

	follow(name: string, fromEnd: boolean): void {
		if (this.followers.has(name)) return;
		const follower = new LogFollower(
			this.env.paths.log(name),
			(lines) => this.printer.lines(name, lines),
			fromEnd,
		);
		follower.start();
		this.followers.set(name, follower);
	}

	unfollowAll(): void {
		for (const follower of this.followers.values()) follower.stop();
		this.followers.clear();
	}

	/** Detaches from components started in the background, so this process can exit. */
	release(): void {
		for (const child of this.children.values()) child.unref();
	}
}

function positiveSeconds(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** How long a component may take to stop after SIGTERM. The launcher uses its own formula. */
function shutdownSeconds(component: Component, env: Record<string, string>): number {
	if (component.kind === 'launcher') {
		const override = positiveSeconds(env.N8N_RUNNERS_LAUNCHER_GRACEFUL_SHUTDOWN_TIMEOUT, 0);
		if (override > 0) return override;
		const grace = positiveSeconds(env.N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT, 30);
		const margin = positiveSeconds(env.N8N_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN, 10);
		return grace + 2 * margin;
	}
	return positiveSeconds(env.N8N_GRACEFUL_SHUTDOWN_TIMEOUT, 30);
}

function signalGroup(pid: number, signal: NodeJS.Signals, fallbackToPid = true): void {
	try {
		process.kill(-pid, signal);
	} catch {
		if (!fallbackToPid || !isPidAlive(pid)) return;
		try {
			process.kill(pid, signal);
		} catch {
			// The process is gone.
		}
	}
}
