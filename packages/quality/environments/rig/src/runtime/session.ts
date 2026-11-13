import { sleep } from '@n8n/utils/sleep';
import { watch } from 'chokidar';
import pc from 'picocolors';

import { describeTopology, requiredServices } from '../config/env-yaml';
import type { RigEnv } from '../environment';
import { RigError } from '../errors';
import { type Component, startStages } from '../topology/components';
import { openUrl, type PrefixPrinter, printError, ui } from '../ui/output';
import { isInteractive, select } from '../ui/prompt';
import { liveState } from './state';
import { type Owner, type Supervisor } from './supervisor';

const SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

export type DependencyMode = 'prompt' | 'background' | 'none';

export interface SessionOptions {
	env: RigEnv;
	supervisor: Supervisor;
	printer: PrefixPrinter;
	/** Components this terminal starts and owns. */
	targets: Component[];
	dependencies: DependencyMode;
	autoRestart: boolean;
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
	private quitting = false;
	private resolveDone: (() => void) | undefined;
	private readonly abort = new AbortController();

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

		const deps = missingDependencies(env, this.targets).filter(
			(dep) => !liveState(env.paths, dep.name),
		);
		let backgroundDeps: Component[] = [];
		if (deps.length > 0 && this.options.dependencies !== 'none') {
			const mode = await this.chooseDependencyMode(deps);
			if (mode === 'abort') throw new RigError('Aborted.');
			if (mode === 'background') backgroundDeps = deps;
			else await this.waitForDependencies(deps);
		}

		const done = new Promise<void>((resolve) => (this.resolveDone = resolve));
		this.installSignalHandlers();
		this.installKeys();
		const watcher = this.watchEnv();
		const monitor = setInterval(() => this.monitor(), 1000);

		try {
			await this.startAll(
				[...backgroundDeps, ...this.targets],
				new Set(backgroundDeps.map((d) => d.name)),
			);
			if (!this.quitting) this.printHelp();
			await done;
		} finally {
			clearInterval(monitor);
			await watcher.close();
			this.uninstallKeys();
			await this.shutdown();
			this.uninstallSignalHandlers();
		}
	}

	private async chooseDependencyMode(deps: Component[]): Promise<'background' | 'wait' | 'abort'> {
		const names = deps.map((d) => d.name).join(', ');
		if (this.options.dependencies === 'background' || !isInteractive()) {
			ui.info(`Starting ${names} in the background. Logs: pnpm rig logs <component> -f`);
			return 'background';
		}
		return await select(`${names} ${deps.length > 1 ? 'are' : 'is'} not running.`, [
			{
				value: 'background',
				label: 'Start in the background',
				hint: 'logs: pnpm rig logs <component> -f',
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

	private async startAll(components: Component[], background: Set<string>): Promise<void> {
		for (const stage of startStages(components)) {
			if (this.quitting) return;
			const results = await Promise.all(
				stage.map(
					async (component) =>
						await this.startOne(component, background.has(component.name) ? 'background' : 'self'),
				),
			);
			if (results.includes(false)) {
				ui.warn('A component did not become ready. rig does not start the next components.');
				ui.step('Fix the problem, then press R to restart, or q to quit.');
				return;
			}
		}
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
			}
			return true;
		}

		const startedAt = Date.now();
		let pid: number;
		this.restarting.add(component.name);
		try {
			pid = await this.supervisor.start(component, owner);
			// Follow after the start: the start replaces the log file.
			if (isTarget) this.supervisor.follow(component.name, false);
		} catch (error) {
			this.restarting.delete(component.name);
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
		if (!isTarget) ui.step(`Logs: pnpm rig logs ${component.name}`);
		return false;
	}

	private editorUrl(): string | undefined {
		try {
			return this.env.editorUrl();
		} catch {
			return undefined;
		}
	}

	private printHelp(): void {
		const url = this.editorUrl();
		const publicUrl = this.env.tunnelUrl();
		const keys = isInteractive()
			? [
					url ? `${pc.bold('[o]')} open ${url}` : undefined,
					publicUrl ? `${pc.bold('[p]')} open ${publicUrl}` : undefined,
					`${pc.bold('[r]')} restart drifted`,
					`${pc.bold('[R]')} restart all`,
					`${pc.bold('[q]')} quit`,
				]
					.filter(Boolean)
					.join('  ')
			: 'Press Ctrl+C to stop.';
		console.log(pc.dim(`── ${keys} ──`));
	}

	private openPublicUrl(): void {
		const url = this.env.tunnelUrl();
		if (!url) {
			ui.warn(
				this.env.topology.tunnel.provider === 'cloudflare'
					? 'The tunnel has no URL yet. Run `pnpm rig services up`.'
					: 'This environment has no tunnel. Set `tunnel: cloudflare` in env.yaml.',
			);
			return;
		}
		ui.info(`Opening ${url}`);
		openUrl(url);
	}

	private openEditor(): void {
		const url = this.editorUrl();
		if (!url) {
			ui.warn('This environment has no main to open.');
			return;
		}
		ui.info(`Opening ${url}`);
		openUrl(url);
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
		else if (key === 'r') this.restartDrifted().catch(printError);
		else if (key === 'R') this.restartTargets(this.targets.map((t) => t.name)).catch(printError);
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

	private async restartTargets(names: string[]): Promise<void> {
		if (this.busy || this.quitting) return;
		this.busy = true;
		try {
			const components = names
				.map((name) => this.env.component(name))
				.filter((c): c is Component => c !== undefined);
			for (const stage of startStages(components)) {
				await Promise.all(
					stage.map(async (component) => {
						this.printer.event(component.name, 'restarting');
						const startedAt = Date.now();
						this.restarting.add(component.name);
						try {
							const pid = await this.supervisor.restart(component, 'self');
							this.lastPid.set(component.name, pid);
							const result = await this.supervisor.waitReady(component, pid, this.abort.signal);
							if (result === 'exited') {
								this.lastPid.set(component.name, undefined);
								await sleep(400);
							}
							if (result === 'ready') {
								this.printer.event(
									component.name,
									pc.green(`ready in ${formatDuration(Date.now() - startedAt)}`),
								);
							} else if (result !== 'aborted') {
								this.printer.event(component.name, pc.red('did not become ready'));
							}
						} catch (error) {
							printError(error);
						} finally {
							this.restarting.delete(component.name);
						}
					}),
				);
			}
			this.drifted = this.drifted.filter((name) => !names.includes(name));
		} finally {
			this.busy = false;
		}
	}

	/** Reports components that exited or that another terminal restarted. */
	private monitor(): void {
		if (this.quitting) return;
		for (const target of this.targets) {
			if (this.supervisor.isStopping(target.name) || this.restarting.has(target.name)) continue;
			const previous = this.lastPid.get(target.name);
			const state = liveState(this.env.paths, target.name);
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
		// A new tunnel URL changes N8N_WEBHOOK_URL, so it is drift too.
		const watcher = watch([paths.layersDir, paths.envYaml, paths.secrets, paths.tunnelState], {
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
		for (const component of removed) {
			ui.warn(
				`${component.name} is no longer in the topology. Stop it with \`pnpm rig stop ${component.name}\`.`,
			);
		}

		this.targets = this.targets
			.map((t) => env.component(t.name))
			.filter((c): c is Component => c !== undefined);

		const drifted: string[] = [];
		for (const target of this.targets) {
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
		const owned = this.targets.filter(
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
				? 'Stopped. Services keep running: `pnpm rig stop` stops them too.'
				: 'Stopped.',
		);
	}
}
