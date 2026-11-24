import { type ChildProcess, spawn } from 'node:child_process';
import { closeSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sleep } from '@n8n/utils/sleep';
import pc from 'picocolors';
import { z } from 'zod';

import type { RigEnv } from '../environment';
import { RigError } from '../errors';
import { ensureLauncherBinary } from '../launcher/binary';
import { nodeBinary, runnerCommand, writeLauncherConfig } from '../launcher/config';
import { CLI_DIR } from '../source';
import {
	type Component,
	portsOf,
	type ProcessComponent,
	type RunnerComponent,
} from '../topology/components';
import type { PrefixPrinter } from '../ui/output';
import { isPortFree, isReady, portOwner, readinessProbe, waitUntilReady } from './health';
import { LogFollower, openNewLog } from './logs';
import {
	clearState,
	type ComponentState,
	currentTty,
	isPidAlive,
	liveState,
	pidIdentity,
	processStartTime,
	writeState,
} from './state';
import { RIG } from '../meta';
import { componentUsingPort, freeSlot } from '../topology/slots';

/** Who owns a started component. */
export type Owner = 'self' | 'background' | { pid: number | null; tty: string | null };

const N8N_SUBCOMMANDS: Record<ProcessComponent['role'], string> = {
	main: 'start',
	worker: 'worker',
	engine: 'engine',
};

const KILL_WAIT_MS = 5000;

/** The default of `N8N_GRACEFUL_SHUTDOWN_TIMEOUT`. */
const DEFAULT_SHUTDOWN_SECONDS = 30;

/**
 * The owner of a restarted component: this process, or another `rig` process
 * that still runs. Without a live owner, the restart uses the fallback.
 */
export function inheritedOwner(previous: ComponentState | undefined, fallback: Owner): Owner {
	if (previous?.ownerPid === process.pid) return 'self';
	if (previous?.ownerPid && isPidAlive(previous.ownerPid)) {
		return { pid: previous.ownerPid, tty: previous.ownerTty };
	}
	return fallback;
}

const READY_TIMEOUT_MS: Record<Component['role'], number> = {
	main: 10 * 60_000,
	worker: 5 * 60_000,
	engine: 5 * 60_000,
	launcher: 2 * 60_000,
	'runner-js': 2 * 60_000,
	'runner-py': 2 * 60_000,
};

interface Command {
	command: string;
	args: string[];
	cwd: string;
}

export type InspectMode = 'inspect' | 'inspect-brk';

export interface SupervisorOptions {
	env: RigEnv;
	printer: PrefixPrinter;
	/** Starts these n8n processes with the Node inspector. */
	inspect?: { mode: InspectMode; components: Set<string> };
}

/** The inspector address of a process. Each process uses offset +5 of its port block. */
export function inspectAddress(component: ProcessComponent): string {
	return `127.0.0.1:${component.ports.inspect}`;
}

export class Supervisor {
	env: RigEnv;
	private readonly printer: PrefixPrinter;
	private readonly inspect?: SupervisorOptions['inspect'];
	private readonly children = new Map<number, ChildProcess>();
	private readonly exitCodes = new Map<number, string>();
	private readonly followers = new Map<string, LogFollower>();
	private readonly stopping = new Set<string>();
	private readonly tty = currentTty();

	constructor(options: SupervisorOptions) {
		this.env = options.env;
		this.printer = options.printer;
		this.inspect = options.inspect;
	}

	private inspectMode(component: Component): InspectMode | undefined {
		if (component.kind !== 'process' || !this.inspect?.components.has(component.name)) {
			return undefined;
		}
		return this.inspect.mode;
	}

	setEnv(env: RigEnv): void {
		this.env = env;
	}

	hash(component: Component): string {
		return this.env.componentHash(component);
	}

	private async command(
		component: Component,
		repoRoot: string,
		inspect: InspectMode | undefined,
	): Promise<Command> {
		if (component.kind === 'launcher') {
			const binary = await ensureLauncherBinary(this.env.launcherSource(), (message) =>
				this.printer.event(component.name, message),
			);
			const runnerTypes = this.env.topology.runners.languages.map((language) =>
				language === 'js' ? 'javascript' : 'python',
			);
			return { command: binary, args: runnerTypes, cwd: this.env.paths.root };
		}
		if (component.kind === 'runner') return runnerCommand(component.language, repoRoot);
		const subcommand = N8N_SUBCOMMANDS[component.role];
		return {
			command: nodeBinary(),
			args: [
				...(inspect ? [`--${inspect}=${inspectAddress(component)}`] : []),
				'bin/n8n',
				subcommand,
			],
			cwd: join(repoRoot, CLI_DIR),
		};
	}

	private async assertPortsFree(component: Component, ports: number[]): Promise<void> {
		for (const port of ports) {
			if (await isPortFree(port)) continue;
			const other = componentUsingPort(port, this.env.name);
			if (other) {
				throw new RigError(
					`Port ${port} of ${component.name} is in use by ${other.component} of the environment ${other.env}.`,
					`Stop it with \`${RIG} stop --env ${other.env}\`, or set \`slot: ${freeSlot(this.env.name)}\` in ${this.env.paths.envYaml} to run both.`,
				);
			}
			const owner = portOwner(port);
			throw new RigError(
				`Port ${port} of ${component.name} is in use${owner ? ` by ${owner}` : ''}.`,
				`Stop that process, or stop the other environment with \`${RIG} stop --env <name>\`.`,
			);
		}
	}

	/** Starts a component. Returns the pid. */
	async start(
		component: Component,
		owner: Owner,
		options: { inspect?: InspectMode } = {},
	): Promise<number> {
		const running = liveState(this.env.paths, component.name);
		if (running) {
			throw new RigError(
				`${component.name} is already running (pid ${running.pid}${running.ownerTty ? `, in ${running.ownerTty}` : ''}).`,
				`Use \`${RIG} restart ${component.name}\` or \`${RIG} stop ${component.name}\`.`,
			);
		}

		const repoRoot = this.env.requireRepoRoot();
		const inspect = options.inspect ?? this.inspectMode(component);
		const ports = portsOf(component, this.env.topology);
		if (inspect && component.kind === 'process') ports.push(component.ports.inspect);
		await this.assertPortsFree(component, ports);
		const { env } = this.env.resolve(component);
		const command = await this.command(component, repoRoot, inspect);
		if (component.kind === 'runner') {
			// The token is single-use, so it is not part of the env hash.
			env.N8N_RUNNERS_GRANT_TOKEN = await this.grantToken(component);
		}

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
			ports,
			processStart: processStartTime(pid),
			source: repoRoot,
			...(inspect ? { inspect } : {}),
		};
		writeState(this.env.paths, state);

		this.children.set(pid, child);
		child.once('exit', (code, signal) => {
			this.children.delete(pid);
			this.exitCodes.set(pid, signal ? signal : `code ${code}`);
			clearState(this.env.paths, component.name, pid);
		});
		if (owner !== 'self') child.unref();
		if (inspect && component.kind === 'process') {
			this.printer.event(
				component.name,
				`inspector on ${pc.bold(`ws://${inspectAddress(component)}`)}${inspect === 'inspect-brk' ? ' · waits for a debugger' : ''} · attach from chrome://inspect or VS Code`,
			);
		}

		return pid;
	}

	/** Asks the task broker of the host for a grant token, as the launcher does. */
	private async grantToken(component: RunnerComponent): Promise<string> {
		const { env: hostEnv } = this.env.resolve(component.host);
		const url = `http://127.0.0.1:${component.host.ports.broker}/runners/auth`;
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: hostEnv.N8N_RUNNERS_AUTH_TOKEN ?? '' }),
				signal: AbortSignal.timeout(5000),
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const body = grantTokenSchema.safeParse(await response.json());
			if (!body.success) throw new Error('the response has no token');
			return body.data.data.token;
		} catch (error) {
			throw new RigError(
				`Cannot get a grant token for ${component.name} from ${component.host.name}: ${error instanceof Error ? error.message : String(error)}`,
				`Start ${component.host.name} first. Its task broker listens on port ${component.host.ports.broker}.`,
			);
		}
	}

	async waitReady(component: Component, pid: number, signal?: AbortSignal) {
		const { env } = this.env.resolve(component);
		return await waitUntilReady({
			probe: readinessProbe(component, env),
			isRunning: () => isPidAlive(pid),
			timeoutMs: READY_TIMEOUT_MS[component.role],
			signal,
		});
	}

	async isComponentReady(component: Component): Promise<boolean> {
		const { env } = this.env.resolve(component);
		return await isReady(readinessProbe(component, env));
	}

	/** Stops a component, whoever owns it. Returns false when it was not running. */
	async stop(component: Component): Promise<boolean> {
		const state = liveState(this.env.paths, component.name);
		if (!state) return false;
		const { env } = this.env.resolve(component);
		await this.stopProcess(state, (shutdownSeconds(component, env) + 5) * 1000);
		return true;
	}

	/** Stops a tracked process that is no longer in the topology, so rig cannot resolve its env. */
	async stopUntracked(state: ComponentState): Promise<void> {
		await this.stopProcess(state, (DEFAULT_SHUTDOWN_SECONDS + 5) * 1000);
	}

	private async stopProcess(state: ComponentState, graceMs: number): Promise<void> {
		const name = state.component;
		this.stopping.add(name);
		try {
			let identity = pidIdentity(state);
			if (identity === 'other') {
				// The pid was recycled. A signal would hit an unrelated process.
				this.notOurs(name, state.pid);
				clearState(this.env.paths, name, state.pid);
				return;
			}
			signalGroup(state.pid, 'SIGTERM');
			const deadline = Date.now() + graceMs;
			while (identity === 'same' && Date.now() < deadline) {
				await sleep(100);
				identity = pidIdentity(state);
			}
			if (identity === 'same') {
				signalGroup(state.pid, 'SIGKILL');
				// A process in uninterruptible sleep ignores SIGKILL. Do not wait for it forever.
				const killDeadline = Date.now() + KILL_WAIT_MS;
				while (identity === 'same' && Date.now() < killDeadline) {
					await sleep(50);
					identity = pidIdentity(state);
				}
				if (identity === 'same') {
					this.printer.event(
						name,
						pc.yellow(`pid ${state.pid} did not exit after SIGKILL. Check it with \`ps\`.`),
					);
				}
			}
			if (identity === 'other') {
				// The component exited and another process took its pid. Do not signal it.
				this.notOurs(name, state.pid);
			} else {
				// The launcher's runners are in its group. Make sure they are gone too.
				signalGroup(state.pid, 'SIGKILL', false);
			}
			clearState(this.env.paths, name, state.pid);
		} finally {
			this.stopping.delete(name);
		}
	}

	private notOurs(name: string, pid: number): void {
		this.printer.event(
			name,
			pc.yellow(`pid ${pid} now belongs to another process. Left it alone.`),
		);
	}

	/** Stops and starts a component. The new process keeps the owner of the old one. */
	async restart(component: Component, owner?: Owner): Promise<number> {
		const previous = liveState(this.env.paths, component.name);
		await this.stop(component);
		const keepOwner = owner ?? inheritedOwner(previous, 'background');
		return await this.start(component, keepOwner, { inspect: previous?.inspect });
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

const grantTokenSchema = z.object({ data: z.object({ token: z.string() }) });

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
	if (component.kind === 'runner') {
		const grace = positiveSeconds(env.N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT, 30);
		return grace + positiveSeconds(env.N8N_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN, 10);
	}
	return positiveSeconds(env.N8N_GRACEFUL_SHUTDOWN_TIMEOUT, DEFAULT_SHUTDOWN_SECONDS);
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
