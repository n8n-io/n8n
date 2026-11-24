import { sleep } from '@n8n/utils/sleep';
import { watch } from 'chokidar';
import pc from 'picocolors';

import { describeTopology, requiredServices } from '../config/env-yaml';
import { configDir } from '../config/paths';
import { StatusLine } from '../ui/status-line';
import type { RigEnv } from '../environment';
import { RigError } from '../errors';
import { type Component, startStages } from '../topology/components';
import { type PrefixPrinter, printError, ui } from '../ui/output';
import { needsBrowserChoice, openUrl } from '../integrations/browser';
import { isInteractive, select } from '../ui/prompt';
import { liveState } from './state';
import { inheritedOwner, type Owner, type Supervisor } from './supervisor';
import { RIG } from '../meta';

const SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

export type DependencyMode = 'prompt' | 'background' | 'wait' | 'none';

type ComponentStatus = 'stopped' | 'starting' | 'ready' | 'exited';

const STATUS_SYMBOLS: Record<ComponentStatus, string> = {
	stopped: pc.dim('○'),
	starting: pc.yellow('◌'),
	ready: pc.green('●'),
	exited: pc.red('✖'),
};

export interface SessionOptions {
	env: RigEnv;
	supervisor: Supervisor;
	printer: PrefixPrinter;
	/** Components this terminal starts and owns. */
	targets: Component[];
	dependencies: DependencyMode;
	autoRestart: boolean;
	/** Also runs the launchers or direct runners that the target processes need. */
	withRunners: boolean;
}

/** Collects dependencies of the targets that are not targets themselves. */
function missingDependencies(env: RigEnv, targets: Component[]): Component[] {
	const targetNames = new Set(targets.map((t) => t.name));
	const result = new Map<string, Component>();
	const visit = (component: Component) => {
		for (const name of component.dependsOn) {
			if (targetNames.has(name) || result.has(name)) continue;
			const dep = env.component(name);
			if (!dep) continue;
			result.set(name, dep);
			visit(dep);
		}
	};
	targets.forEach(visit);
	return [...result.values()];
}

function formatDuration(ms: number): string {
	return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Runs components in the foreground: starts them in order, shows their logs,
 * restarts them on request, and stops them when the user quits.
 */
export class Session {
	private env: RigEnv;
	private readonly supervisor: Supervisor;
	private readonly printer: PrefixPrinter;
	private targets: Component[];
	private readonly lastPid = new Map<string, number | undefined>();
	private drifted: string[] = [];
	/** Components in a start or a restart. `startOne` and `restartTargets` report their exits. */
	private readonly restarting = new Set<string>();
	private busy = false;
	private activeRestart: Promise<void> | undefined;
	/** Components that left the topology while this session ran. The shutdown still stops them. */
	private removed: Component[] = [];
	/** Dependencies that this session started in the background. `R` starts them again when they do not run. */
	private backgroundDeps: Component[] = [];
	private quitting = false;
	private resolveDone: (() => void) | undefined;
	private readonly abort = new AbortController();
	private readonly statuses = new Map<string, ComponentStatus>();
	private readonly statusLine = new StatusLine();
	private filter = new Set<string>();
	private readonly probing = new Set<string>();

	constructor(private readonly options: SessionOptions) {
		this.env = options.env;
		this.supervisor = options.supervisor;
		this.printer = options.printer;
		this.targets = options.targets;
	}

	async run(): Promise<void> {
		const { env } = this;
		this.printer.register(this.targets.map((t) => t.name));

		ui.header(`rig · ${env.name} · ${describeTopology(env.topology)}`);

		const allDeps = missingDependencies(env, this.targets);
		const deps = allDeps.filter((dep) => !liveState(env.paths, dep.name));
		let backgroundDeps: Component[] = [];
		if (this.options.dependencies !== 'none') {
			// A dependency that runs can still be starting. Its dependents need it ready.
			await this.waitForRunningDependencies(allDeps.filter((dep) => !deps.includes(dep)));
			if (deps.length > 0) {
				const mode = await this.chooseDependencyMode(deps);
				if (mode === 'abort') throw new RigError('Aborted.');
				if (mode === 'background') this.backgroundDeps = backgroundDeps = deps;
				else await this.waitForDependencies(deps);
			}
		}

		const done = new Promise<void>((resolve) => (this.resolveDone = resolve));
		this.installSignalHandlers();
		this.installKeys();
		if (isInteractive()) this.statusLine.start();
		this.renderStatus();
		const watcher = this.watchEnv();
		const monitor = setInterval(() => this.monitor(), 1000);

		try {
			const started = await this.startAll(
				[...backgroundDeps, ...this.targets],
				new Set(backgroundDeps.map((d) => d.name)),
			);
			if (!started && !isInteractive()) {
				// Without a terminal, nobody can press R. Stop and report the failure.
				process.exitCode = 1;
				this.quit();
			}
			if (!this.quitting) this.printHelp();
			await done;
		} finally {
			clearInterval(monitor);
			await watcher.close();
			this.uninstallKeys();
			this.statusLine.stop();
			await this.shutdown();
			this.uninstallSignalHandlers();
		}
	}

	private async chooseDependencyMode(deps: Component[]): Promise<'background' | 'wait' | 'abort'> {
		const names = deps.map((d) => d.name).join(', ');
		if (this.options.dependencies === 'wait') return 'wait';
		if (this.options.dependencies === 'background' || !isInteractive()) {
			ui.info(`Starting ${names} in the background. Logs: ${RIG} logs <component> -f`);
			return 'background';
		}
		return await select(`${names} ${deps.length > 1 ? 'are' : 'is'} not running.`, [
			{
				value: 'background',
				label: 'Start in the background',
				hint: `logs: ${RIG} logs <component> -f`,
			},
			{ value: 'wait', label: 'Wait', hint: 'start it in another terminal' },
			{ value: 'abort', label: 'Abort' },
		]);
	}

	private async waitForDependencies(deps: Component[]): Promise<void> {
		ui.info(`Waiting for ${deps.map((d) => d.name).join(', ')}. Start them in another terminal.`);
		for (const dep of deps) {
			while (!this.abort.signal.aborted) {
				if (liveState(this.env.paths, dep.name) && (await this.supervisor.isComponentReady(dep))) {
					ui.success(`${dep.name} is ready`);
					break;
				}
				await sleep(1000);
			}
		}
	}

	private async waitForRunningDependencies(deps: Component[]): Promise<void> {
		for (const dep of deps) {
			const state = liveState(this.env.paths, dep.name);
			if (!state || (await this.supervisor.isComponentReady(dep))) continue;
			ui.info(`Waiting for ${dep.name} to become ready.`);
			const result = await this.supervisor.waitReady(dep, state.pid, this.abort.signal);
			if (result !== 'ready') {
				throw new RigError(
					`${dep.name} did not become ready.`,
					`Check its logs with \`${RIG} logs ${dep.name}\`.`,
				);
			}
		}
	}

	/** Starts components stage by stage. Returns false when one is not ready. */
	private async startAll(components: Component[], background: Set<string>): Promise<boolean> {
		for (const stage of startStages(components)) {
			if (this.quitting) return true;
			const results = await Promise.all(
				stage.map(
					async (component) =>
						await this.startOne(component, background.has(component.name) ? 'background' : 'self'),
				),
			);
			if (results.includes(false)) {
				ui.warn('A component did not become ready. rig does not start the next components.');
				if (isInteractive()) ui.step('Fix the problem, then press R to restart, or q to quit.');
				return false;
			}
		}
		return true;
	}

	/** Starts one component and waits until it is ready. Returns false when it is not ready. */
	private async startOne(component: Component, owner: Owner): Promise<boolean> {
		const isTarget = owner === 'self';
		const running = liveState(this.env.paths, component.name);
		if (running) {
			if (isTarget) {
				this.printer.event(
					component.name,
					`already running (pid ${running.pid}${running.ownerTty ? `, ${running.ownerTty}` : ''}). Showing its logs.`,
				);
				this.supervisor.follow(component.name, true);
				this.supervisor.adopt(running);
				this.lastPid.set(component.name, running.pid);
				this.setStatus(component.name, 'starting');
			}
			// The next stage depends on it, so it must be ready, not only running.
			const result = await this.supervisor.waitReady(component, running.pid, this.abort.signal);
			if (isTarget) this.setStatus(component.name, result === 'ready' ? 'ready' : 'exited');
			if (result === 'exited' || result === 'timeout') {
				this.printer.event(component.name, pc.red('did not become ready'));
			}
			return result === 'ready';
		}

		const startedAt = Date.now();
		let pid: number;
		this.restarting.add(component.name);
		if (isTarget) this.setStatus(component.name, 'starting');
		try {
			pid = await this.supervisor.start(component, owner);
			// Follow after the start: the start replaces the log file.
			if (isTarget) this.supervisor.follow(component.name, false);
		} catch (error) {
			this.restarting.delete(component.name);
			if (isTarget) this.setStatus(component.name, 'exited');
			printError(error);
			return false;
		}
		if (isTarget) this.lastPid.set(component.name, pid);
		else ui.step(`${component.name} started in the background (pid ${pid})`);

		const result = await this.supervisor.waitReady(component, pid, this.abort.signal);
		this.restarting.delete(component.name);
		if (result === 'exited') {
			this.lastPid.set(component.name, undefined);
			// Let the log follower print the last lines before the exit message.
			await sleep(400);
		}
		const label = isTarget ? component.name : `${component.name} (background)`;
		if (isTarget) this.setStatus(component.name, result === 'ready' ? 'ready' : 'exited');
		if (result === 'ready') {
			this.printer.event(label, pc.green(`ready in ${formatDuration(Date.now() - startedAt)}`));
			return true;
		}
		if (result === 'aborted') return false;
		const reason = this.supervisor.exitReason(pid);
		this.printer.event(
			label,
			pc.red(
				result === 'exited'
					? `exited before it was ready${reason ? ` (${reason})` : ''}`
					: 'did not become ready in time',
			),
		);
		if (!isTarget) ui.step(`Logs: ${RIG} logs ${component.name}`);
		return false;
	}

	private editorUrl(): string | undefined {
		try {
			return this.env.editorUrl();
		} catch {
			return undefined;
		}
	}

	private printHelp(full = false): void {
		const url = this.editorUrl();
		const publicUrl = this.env.tunnelUrl();
		const mailUrl = this.env.mailUrl();
		const keys = isInteractive()
			? [
					url ? `${pc.bold('[o]')} open ${url}` : undefined,
					publicUrl ? `${pc.bold('[p]')} open ${publicUrl}` : undefined,
					mailUrl ? `${pc.bold('[m]')} open mail ${mailUrl}` : undefined,
					`${pc.bold('[r]')} restart drifted`,
					`${pc.bold('[R]')} restart all`,
					full || this.targets.length > 1
						? `${pc.bold(`[1-${Math.min(9, this.targets.length)}]`)} show only some logs ${pc.bold('[0]')} all`
						: undefined,
					`${pc.bold('[q]')} quit`,
				]
					.filter(Boolean)
					.join('  ')
			: 'Press Ctrl+C to stop.';
		console.log(pc.dim(`── ${keys} ──`));
	}

	private setStatus(name: string, status: ComponentStatus): void {
		if (this.statuses.get(name) === status) return;
		this.statuses.set(name, status);
		this.renderStatus();
	}

	/** Checks the readiness of a component that this session did not start, once at a time. */
	private probeReady(component: Component): void {
		if (this.probing.has(component.name)) return;
		this.probing.add(component.name);
		this.supervisor
			.isComponentReady(component)
			.then((ready) => this.setStatus(component.name, ready ? 'ready' : 'starting'))
			.catch(() => {})
			.finally(() => this.probing.delete(component.name));
	}

	/** Shows only the logs of the chosen components. A key adds or removes one. 0 shows all. */
	private toggleFilter(index: number | undefined): void {
		const target = index === undefined ? undefined : this.targets[index];
		if (index !== undefined && !target) return;
		if (!target) this.filter = new Set();
		else if (this.filter.has(target.name)) this.filter.delete(target.name);
		else this.filter.add(target.name);
		this.printer.setFilter(this.filter);
		console.log(
			pc.dim(
				this.filter.size === 0
					? '── showing the logs of all components ──'
					: `── showing only ${[...this.filter].join(', ')} · 0 shows all ──`,
			),
		);
		this.renderStatus();
	}

	private renderStatus(): void {
		const parts = this.targets.map((target, index) => {
			const status = this.statuses.get(target.name) ?? 'stopped';
			const symbol = STATUS_SYMBOLS[status];
			const hidden = this.filter.size > 0 && !this.filter.has(target.name);
			const name = hidden ? pc.dim(target.name) : this.printer.color(target.name)(target.name);
			const drift = this.drifted.includes(target.name) ? pc.yellow('⟳') : '';
			return `${index < 9 ? pc.dim(String(index + 1)) : ' '}${symbol} ${name}${drift}`;
		});
		this.statusLine.update(` ${parts.join('  ')}  ${pc.dim('│ ? keys')}`);
	}

	private openPublicUrl(): void {
		const url = this.env.tunnelUrl();
		if (!url) {
			ui.warn(
				this.env.topology.tunnel.provider === 'cloudflare'
					? `The tunnel has no URL yet. Run \`${RIG} services up\`.`
					: 'This environment has no tunnel. Set `tunnel: cloudflare` in env.yaml.',
			);
			return;
		}
		this.open(url).catch(printError);
	}

	private openMail(): void {
		const url = this.env.mailUrl();
		if (!url) {
			ui.warn('This environment has no mail server. Set `mail: mailpit` in env.yaml.');
			return;
		}
		this.open(url).catch(printError);
	}

	private openEditor(): void {
		const url = this.editorUrl();
		if (!url) {
			ui.warn('This environment has no main to open.');
			return;
		}
		this.open(url).catch(printError);
	}

	/**
	 * Opens a URL. The first time, rig asks for the browser. During the
	 * question, the keys go to the prompt and the logs wait.
	 */
	private async open(url: string): Promise<void> {
		if (!needsBrowserChoice()) {
			ui.info(`Opening ${url}`);
			await openUrl(url);
			return;
		}
		this.uninstallKeys();
		this.printer.hold();
		try {
			await openUrl(url);
			ui.info(`Opening ${url}`);
		} finally {
			this.printer.release();
			if (!this.quitting) this.installKeys();
		}
	}

	private readonly onSignal = () => {
		if (this.quitting) console.log(pc.dim('Still stopping components…'));
		this.quit();
	};

	private installSignalHandlers(): void {
		for (const signal of SIGNALS) process.on(signal, this.onSignal);
	}

	private uninstallSignalHandlers(): void {
		for (const signal of SIGNALS) process.off(signal, this.onSignal);
	}

	private onKey = (data: Buffer) => {
		const key = data.toString();
		if (key === '\u0003' || key === 'q') this.quit();
		else if (key === 'o') this.openEditor();
		else if (key === 'p') this.openPublicUrl();
		else if (key === 'm') this.openMail();
		else if (key === 'r') this.restartDrifted().catch(printError);
		else if (key === 'R')
			this.restartTargets(
				this.targets.map((t) => t.name),
				true,
			).catch(printError);
		else if (/^[1-9]$/.test(key)) this.toggleFilter(Number(key) - 1);
		else if (key === '0') this.toggleFilter(undefined);
		else if (key === '?' || key === 'h') this.printHelp(true);
		else if (key === '\r' || key === '\n') console.log('');
	};

	private installKeys(): void {
		if (!isInteractive()) return;
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on('data', this.onKey);
	}

	private uninstallKeys(): void {
		if (!isInteractive()) return;
		process.stdin.off('data', this.onKey);
		try {
			process.stdin.setRawMode(false);
			process.stdin.pause();
		} catch {
			// The terminal is gone. The shutdown must still run.
		}
	}

	private quit(): void {
		if (this.quitting) return;
		this.quitting = true;
		this.abort.abort();
		this.resolveDone?.();
	}

	private async restartDrifted(): Promise<void> {
		if (this.drifted.length === 0) {
			ui.info('No component has env drift.');
			return;
		}
		await this.restartTargets(this.drifted);
	}

	private async restartTargets(names: string[], withBackgroundDeps = false): Promise<void> {
		if (this.busy || this.quitting) return;
		this.busy = true;
		// The shutdown waits for it, so a quit cannot leave a new process behind.
		this.activeRestart = this.restartStages(names, withBackgroundDeps);
		try {
			await this.activeRestart;
		} finally {
			this.activeRestart = undefined;
			this.busy = false;
		}
	}

	private async restartStages(names: string[], withBackgroundDeps: boolean): Promise<void> {
		if (withBackgroundDeps) {
			const deps = this.backgroundDeps
				.map((dep) => this.env.component(dep.name))
				.filter((c): c is Component => c !== undefined && !liveState(this.env.paths, c.name));
			if (deps.length > 0 && !(await this.startAll(deps, new Set(deps.map((d) => d.name))))) {
				return;
			}
		}
		const requested = names
			.map((name) => this.env.component(name))
			.filter((c): c is Component => c !== undefined);
		// Without runners, only the direct runners that run already restart with their host.
		const components = this.env
			.withDependentRunners(requested)
			.filter(
				(c) =>
					this.options.withRunners ||
					requested.includes(c) ||
					liveState(this.env.paths, c.name) !== undefined,
			);
		const restarted: string[] = [];
		for (const stage of startStages(components)) {
			if (this.quitting) return;
			const results = await Promise.all(
				stage.map(async (component): Promise<boolean> => {
					this.printer.event(component.name, 'restarting');
					const startedAt = Date.now();
					this.restarting.add(component.name);
					this.setStatus(component.name, 'starting');
					try {
						const previous = liveState(this.env.paths, component.name);
						await this.supervisor.stop(component);
						if (this.quitting) return false;
						// A component that another live terminal owns stays with that terminal.
						const pid = await this.supervisor.start(component, inheritedOwner(previous, 'self'), {
							inspect: previous?.inspect,
						});
						// A component that a configuration change added has no log follower yet.
						this.supervisor.follow(component.name, false);
						this.lastPid.set(component.name, pid);
						const result = await this.supervisor.waitReady(component, pid, this.abort.signal);
						if (result === 'exited') {
							this.lastPid.set(component.name, undefined);
							await sleep(400);
						}
						this.setStatus(component.name, result === 'ready' ? 'ready' : 'exited');
						if (result === 'ready') {
							this.printer.event(
								component.name,
								pc.green(`ready in ${formatDuration(Date.now() - startedAt)}`),
							);
						} else if (result !== 'aborted') {
							this.printer.event(component.name, pc.red('did not become ready'));
						}
						return result === 'ready';
					} catch (error) {
						this.setStatus(component.name, 'exited');
						printError(error);
						return false;
					} finally {
						this.restarting.delete(component.name);
					}
				}),
			);
			if (this.quitting) return;
			restarted.push(...stage.map((c) => c.name));
			if (results.includes(false)) {
				ui.warn('A component did not become ready. rig does not restart the next components.');
				break;
			}
		}
		this.drifted = this.drifted.filter((name) => !restarted.includes(name));
		this.renderStatus();
	}

	/** Reports components that exited or that another terminal restarted. */
	private monitor(): void {
		if (this.quitting) return;
		for (const target of this.targets) {
			if (this.supervisor.isStopping(target.name) || this.restarting.has(target.name)) continue;
			const previous = this.lastPid.get(target.name);
			const state = liveState(this.env.paths, target.name);
			if (!state && this.statuses.get(target.name) !== 'exited') {
				this.setStatus(target.name, 'exited');
			} else if (state && this.statuses.get(target.name) !== 'ready') {
				this.probeReady(target);
			}
			if (state?.pid === previous) continue;
			if (!state && previous !== undefined) {
				const reason = this.supervisor.exitReason(previous);
				this.lastPid.set(target.name, undefined);
				// Wait a moment: the log follower prints the last lines, and another
				// terminal that restarts the component writes its new state.
				setTimeout(() => {
					const next = liveState(this.env.paths, target.name);
					if (next) {
						this.supervisor.adopt(next);
						this.lastPid.set(target.name, next.pid);
						this.printer.event(target.name, `restarted by another terminal (pid ${next.pid})`);
						return;
					}
					this.printer.event(
						target.name,
						pc.red(`exited${reason ? ` (${reason})` : ''}. Press R to restart.`),
					);
				}, 1500);
				continue;
			} else if (state && previous !== undefined) {
				this.printer.event(target.name, `restarted by another terminal (pid ${state.pid})`);
			}
			if (state) this.supervisor.adopt(state);
			this.lastPid.set(target.name, state?.pid);
		}
	}

	private watchEnv() {
		const { paths } = this.env;
		// A new tunnel URL changes N8N_WEBHOOK_URL, so it is drift too. The config
		// directory holds the profiles and the global secrets.
		const watched = [paths.layersDir, paths.envYaml, paths.secrets, paths.tunnelState, configDir()];
		const watcher = watch(watched, {
			ignoreInitial: true,
			awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
		});
		let timer: NodeJS.Timeout | undefined;
		watcher.on('all', () => {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				this.onEnvChange().catch(printError);
			}, 250);
		});
		return watcher;
	}

	private async onEnvChange(): Promise<void> {
		if (this.quitting) return;
		let env: RigEnv;
		try {
			env = this.env.reload();
		} catch (error) {
			printError(error);
			return;
		}
		this.env = env;
		this.supervisor.setEnv(env);

		const known = new Set(env.components().map((c) => c.name));
		const removed = this.targets.filter((t) => !known.has(t.name));
		this.removed = this.removed.filter((c) => !known.has(c.name));
		for (const component of removed) {
			const state = liveState(env.paths, component.name);
			if (state?.ownerPid === process.pid) {
				this.removed.push(component);
				ui.warn(`${component.name} is no longer in the topology. It stops when you quit.`);
			} else if (state) {
				ui.warn(
					`${component.name} is no longer in the topology. It still runs as pid ${state.pid}. End that process to stop it.`,
				);
			}
		}

		this.targets = this.targets
			.map((t) => env.component(t.name))
			.filter((c): c is Component => c !== undefined);

		// A change can make a process need a launcher or runners. They start with its next restart.
		const added: Component[] = [];
		if (this.options.withRunners) {
			const names = new Set(this.targets.map((t) => t.name));
			added.push(...env.runnerHosts().filter((c) => names.has(c.host.name) && !names.has(c.name)));
			this.targets.push(...added);
			this.printer.register(added.map((c) => c.name));
		}

		const drifted: string[] = [];
		for (const target of this.targets) {
			if (added.includes(target)) {
				if (!liveState(env.paths, target.name)) drifted.push(target.name);
				continue;
			}
			const state = liveState(env.paths, target.name);
			if (!state) continue;
			try {
				if (this.supervisor.hash(target) !== state.envHash) drifted.push(target.name);
			} catch (error) {
				printError(error);
				return;
			}
		}
		this.drifted = drifted;
		this.renderStatus();
		if (drifted.length === 0) return;

		if (this.options.autoRestart) {
			ui.info(`Env changed for ${drifted.join(', ')}. Restarting.`);
			await this.restartTargets(drifted);
			return;
		}
		console.log(
			`${pc.yellow('⟳')} env changed for ${pc.bold(drifted.join(', '))}: press ${pc.bold('r')} to restart, ${pc.bold('R')} to restart all`,
		);
	}

	/** Stops the components that this terminal owns, in reverse start order. */
	private async shutdown(): Promise<void> {
		await this.activeRestart?.catch(printError);
		const owned = [...this.targets, ...this.removed].filter(
			(t) => liveState(this.env.paths, t.name)?.ownerPid === process.pid,
		);
		if (owned.length > 0) {
			console.log('');
			ui.info(`Stopping ${owned.map((c) => c.name).join(', ')}`);
		}
		for (const stage of startStages(owned).reverse()) {
			await Promise.all(
				stage.map(async (component) => {
					try {
						await this.supervisor.stop(component);
					} catch (error) {
						printError(error);
					}
				}),
			);
		}
		this.supervisor.unfollowAll();
		this.supervisor.release();
		if (owned.length === 0) return;
		ui.success(
			requiredServices(this.env.topology).length > 0
				? `Stopped. Services keep running: \`${RIG} stop\` stops them too.`
				: 'Stopped.',
		);
	}
}
