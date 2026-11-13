import type { Topology } from '../config/env-yaml';

export type ProcessRole = 'main' | 'worker' | 'engine';
export type Role = ProcessRole | 'launcher';

/** Layers that configure a launcher's runners. They are not components. */
export const RUNNER_LAYERS = ['runner-js', 'runner-py'] as const;
export type RunnerLayer = (typeof RUNNER_LAYERS)[number];

export const ROLES: readonly Role[] = ['main', 'worker', 'engine', 'launcher'];

/** The port block of one n8n process. See the Ports section of the spec. */
export interface PortBlock {
	base: number;
	/** `N8N_PORT`, `QUEUE_HEALTH_CHECK_PORT`, or `N8N_ENGINE_PORT`. */
	http: number;
	broker: number;
	launcherHealth: number;
	jsHealth: number;
	pyHealth: number;
}

export const MAIN_PORT_BASE = 5678;
export const WORKER_PORT_BASE = 5778;
export const ENGINE_PORT_BASE = 5878;
export const ENGINE_HTTP_PORT = 3000;
export const ENGINE_CONTROL_PLANE_PORT = 3001;

function block(base: number, http = base): PortBlock {
	return {
		base,
		http,
		broker: base + 1,
		launcherHealth: base + 2,
		jsHealth: base + 3,
		pyHealth: base + 4,
	};
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

export type Component = ProcessComponent | LauncherComponent;

export function launcherName(host: string): string {
	return `launcher@${host}`;
}

export function processComponents(topology: Topology): ProcessComponent[] {
	const components: ProcessComponent[] = [];
	for (let i = 1; i <= topology.mains; i++) {
		components.push({
			kind: 'process',
			name: `main-${i}`,
			role: 'main',
			index: i,
			ports: block(MAIN_PORT_BASE + 10 * (i - 1)),
			dependsOn: i === 1 ? [] : ['main-1'],
		});
	}
	for (let i = 1; i <= topology.workers; i++) {
		components.push({
			kind: 'process',
			name: `worker-${i}`,
			role: 'worker',
			index: i,
			ports: block(WORKER_PORT_BASE + 10 * (i - 1)),
			dependsOn: ['main-1'],
		});
	}
	if (topology.engine === 'remote') {
		components.push({
			kind: 'process',
			name: 'engine',
			role: 'engine',
			index: 1,
			ports: block(ENGINE_PORT_BASE, ENGINE_HTTP_PORT),
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
		if (component.role === 'main' && topology.engine === 'remote') {
			ports.push(ENGINE_CONTROL_PLANE_PORT);
		}
		return ports;
	}
	const { ports } = component.host;
	const result = [ports.launcherHealth];
	if (topology.runners.languages.includes('js')) result.push(ports.jsHealth);
	if (topology.runners.languages.includes('python')) result.push(ports.pyHealth);
	return result;
}
