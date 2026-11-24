import type { Language, Topology } from '../config/env-yaml';

export type ProcessRole = 'main' | 'worker' | 'engine';

/**
 * Layers that configure the runners. With `runners.via: launcher` they are the
 * env-overrides of the launcher config. With `direct` they are also the roles of
 * the runner components.
 */
export const RUNNER_LAYERS = ['runner-js', 'runner-py'] as const;
export type RunnerLayer = (typeof RUNNER_LAYERS)[number];

export type Role = ProcessRole | 'launcher' | RunnerLayer;

export const ROLES: readonly Role[] = ['main', 'worker', 'engine', 'launcher', ...RUNNER_LAYERS];

export const RUNNER_LAYER_OF: Record<Language, RunnerLayer> = {
	js: 'runner-js',
	python: 'runner-py',
};

/** The port block of one n8n process. See the Ports section of the spec. */
export interface PortBlock {
	base: number;
	/** `N8N_PORT`, `QUEUE_HEALTH_CHECK_PORT`, or `N8N_ENGINE_PORT`. */
	http: number;
	broker: number;
	launcherHealth: number;
	jsHealth: number;
	pyHealth: number;
	/** The Node inspector with `--inspect`. */
	inspect: number;
	/** The engine v2 control plane server of a main. The engine dials the one of main-1. */
	controlPlane: number;
}

export const MAIN_PORT_BASE = 5678;
export const WORKER_PORT_BASE = 5778;
export const ENGINE_PORT_BASE = 5878;
export const ENGINE_HTTP_PORT = 3000;
/** Slot k moves every n8n port by this step times k. */
export const SLOT_PORT_STEP = 1000;

function slotOffset(topology: Topology): number {
	return SLOT_PORT_STEP * topology.slot;
}

/**
 * The engine ports move by 10 for each slot: 3000, 3010, and so on. A step of
 * 1000 would reach port 5000, which macOS uses for AirPlay.
 */
const ENGINE_SLOT_STEP = 10;

export function engineHttpPort(topology: Topology): number {
	return ENGINE_HTTP_PORT + ENGINE_SLOT_STEP * topology.slot;
}

function block(base: number, http = base): PortBlock {
	return {
		base,
		http,
		broker: base + 1,
		launcherHealth: base + 2,
		jsHealth: base + 3,
		pyHealth: base + 4,
		inspect: base + 5,
		controlPlane: base + 6,
	};
}

function mainBlock(topology: Topology, index: number): PortBlock {
	return block(slotOffset(topology) + MAIN_PORT_BASE + 10 * (index - 1));
}

/** The control plane port that the engine dials: the one of main-1. */
export function engineControlPlanePort(topology: Topology): number {
	return mainBlock(topology, 1).controlPlane;
}

export interface ProcessComponent {
	kind: 'process';
	name: string;
	role: ProcessRole;
	index: number;
	ports: PortBlock;
	dependsOn: string[];
}

export interface LauncherComponent {
	kind: 'launcher';
	name: string;
	role: 'launcher';
	host: ProcessComponent;
	dependsOn: string[];
}

/** A task runner that rig runs itself (`runners.via: direct`). */
export interface RunnerComponent {
	kind: 'runner';
	name: string;
	role: RunnerLayer;
	language: Language;
	host: ProcessComponent;
	dependsOn: string[];
}

/** A launcher or a direct runner: a component that serves the task broker of a host. */
export type RunnerHostComponent = LauncherComponent | RunnerComponent;

export type Component = ProcessComponent | LauncherComponent | RunnerComponent;

export function launcherName(host: string): string {
	return `launcher@${host}`;
}

export function processComponents(topology: Topology): ProcessComponent[] {
	const components: ProcessComponent[] = [];
	const offset = slotOffset(topology);
	for (let i = 1; i <= topology.mains; i++) {
		components.push({
			kind: 'process',
			name: `main-${i}`,
			role: 'main',
			index: i,
			ports: mainBlock(topology, i),
			dependsOn: i === 1 ? [] : ['main-1'],
		});
	}
	for (let i = 1; i <= topology.workers; i++) {
		components.push({
			kind: 'process',
			name: `worker-${i}`,
			role: 'worker',
			index: i,
			ports: block(offset + WORKER_PORT_BASE + 10 * (i - 1)),
			dependsOn: ['main-1'],
		});
	}
	if (topology.engine === 'remote') {
		components.push({
			kind: 'process',
			name: 'engine',
			role: 'engine',
			index: 1,
			ports: block(offset + ENGINE_PORT_BASE, engineHttpPort(topology)),
			dependsOn: ['main-1'],
		});
	}
	return components;
}

/**
 * Whether a process runs tasks, so it needs a launcher. In queue mode a main
 * runs tasks only when it does not offload manual executions to workers.
 */
export function runsTasks(
	topology: Topology,
	component: ProcessComponent,
	offloadsManualExecutions: boolean,
): boolean {
	if (topology.runners.mode !== 'external') return false;
	if (component.role !== 'main') return true;
	return !topology.queue || !offloadsManualExecutions;
}

export function launcherComponents(
	topology: Topology,
	processes: ProcessComponent[],
	offloadsManualExecutions: (main: ProcessComponent) => boolean,
): LauncherComponent[] {
	if (topology.runners.via !== 'launcher') return [];
	return processes
		.filter((host) =>
			runsTasks(topology, host, host.role === 'main' && offloadsManualExecutions(host)),
		)
		.map((host) => ({
			kind: 'launcher',
			name: launcherName(host.name),
			role: 'launcher',
			host,
			dependsOn: [host.name],
		}));
}

/** With `runners.via: direct`: one runner for each language and each process that runs tasks. */
export function runnerComponents(
	topology: Topology,
	processes: ProcessComponent[],
	offloadsManualExecutions: (main: ProcessComponent) => boolean,
): RunnerComponent[] {
	if (topology.runners.via !== 'direct') return [];
	return processes
		.filter((host) =>
			runsTasks(topology, host, host.role === 'main' && offloadsManualExecutions(host)),
		)
		.flatMap((host) =>
			topology.runners.languages.map((language) => ({
				kind: 'runner' as const,
				name: `${RUNNER_LAYER_OF[language]}@${host.name}`,
				role: RUNNER_LAYER_OF[language],
				language,
				host,
				dependsOn: [host.name],
			})),
		);
}

/** Orders components so each one comes after its dependencies. */
export function startStages(components: Component[]): Component[][] {
	const byName = new Map(components.map((c) => [c.name, c]));
	const depth = new Map<string, number>();

	const depthOf = (component: Component, seen: Set<string>): number => {
		const cached = depth.get(component.name);
		if (cached !== undefined) return cached;
		if (seen.has(component.name)) return 0;
		seen.add(component.name);
		let value = 0;
		for (const dep of component.dependsOn) {
			const depComponent = byName.get(dep);
			if (depComponent) value = Math.max(value, depthOf(depComponent, seen) + 1);
		}
		depth.set(component.name, value);
		return value;
	};

	const stages: Component[][] = [];
	for (const component of components) {
		const d = depthOf(component, new Set());
		(stages[d] ??= []).push(component);
	}
	return stages.filter((stage) => stage.length > 0);
}

/** Ports a component listens on. `rig` checks them before it starts the component. */
export function portsOf(component: Component, topology: Topology): number[] {
	if (component.kind === 'process') {
		// The broker also listens in internal mode, where n8n starts the runners itself.
		const ports = [component.ports.http, component.ports.broker];
		if (component.role === 'main' && topology.engine === 'in-process') {
			ports.push(engineHttpPort(topology), component.ports.controlPlane);
		} else if (component.role === 'main' && topology.engine === 'remote') {
			ports.push(component.ports.controlPlane);
		}
		return ports;
	}
	const { ports } = component.host;
	if (component.kind === 'runner')
		return [component.language === 'js' ? ports.jsHealth : ports.pyHealth];
	const result = [ports.launcherHealth];
	if (topology.runners.languages.includes('js')) result.push(ports.jsHealth);
	if (topology.runners.languages.includes('python')) result.push(ports.pyHealth);
	return result;
}
