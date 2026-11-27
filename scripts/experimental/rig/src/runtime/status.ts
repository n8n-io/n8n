import { describeTopology, requiredServices, servicePorts } from '../config/env-yaml';
import type { RigEnv } from '../environment';
import { serviceAddress, servicesStatus, type ServiceName } from '../services/compose';
import { type Component, portsOf } from '../topology/components';
import { isReady, readinessProbe } from './health';
import { type ComponentState, liveState } from './state';
import type { Supervisor } from './supervisor';

/**
 * The version of the `rig status --format json` output. Raise it when a field changes
 * its meaning or goes away. New fields do not change the version.
 */
export const STATUS_SCHEMA_VERSION = 1;

export interface ServiceStatusEntry {
	name: ServiceName;
	/** The container state, for example `running`, or `stopped` when there is no container. */
	state: string;
	/** The health check result. Null when there is no container or no health check. */
	health: string | null;
	/** The host ports, with the slot. */
	ports: number[];
	address: string;
}

export interface ComponentStatusEntry {
	name: string;
	kind: Component['kind'];
	role: Component['role'];
	state: 'stopped' | 'starting' | 'ready';
	pid: number | null;
	/** The ports of the component, with the slot. */
	ports: number[];
	/** The port of the Node inspector, when the component runs with `--inspect`. */
	inspectPort: number | null;
	/** The editor URL of a main. */
	url: string | null;
	startedAt: string | null;
	/** The `rig` process that shows the logs. Null when the component runs in the background. */
	owner: { pid: number; tty: string | null } | null;
	/** True when the env changed after the start. */
	drift: boolean;
	/** The checkout that the component runs from. */
	source: string | null;
}

export interface EnvStatus {
	schemaVersion: typeof STATUS_SCHEMA_VERSION;
	env: string;
	topology: string;
	slot: number;
	/**
	 * The checkout that a start from this directory uses. With `source: auto`,
	 * it can differ from the `source` of the running components.
	 */
	source: string | null;
	urls: { editor: string | null; mail: string | null; public: string | null };
	services: ServiceStatusEntry[];
	components: ComponentStatusEntry[];
}

function componentEntry(
	env: RigEnv,
	component: Component,
	state: ComponentState | undefined,
	checks: { ready: boolean; drift: boolean },
): ComponentStatusEntry {
	const isMain = component.kind === 'process' && component.role === 'main';
	return {
		name: component.name,
		kind: component.kind,
		role: component.role,
		state: !state ? 'stopped' : checks.ready ? 'ready' : 'starting',
		pid: state?.pid ?? null,
		ports: portsOf(component, env.topology),
		inspectPort: state?.inspect && component.kind === 'process' ? component.ports.inspect : null,
		url: isMain ? env.editorUrl(component.name) : null,
		startedAt: state?.startedAt ?? null,
		owner: state?.ownerPid ? { pid: state.ownerPid, tty: state.ownerTty } : null,
		drift: checks.drift,
		source: state?.source ?? null,
	};
}

/** Reads the state of the services and components of an environment. */
export async function collectStatus(env: RigEnv, supervisor: Supervisor): Promise<EnvStatus> {
	const needed = requiredServices(env.topology);
	const statuses = needed.length > 0 ? servicesStatus(env.name, env.topology) : [];
	const services = needed.map((name): ServiceStatusEntry => {
		const status = statuses.find((s) => s.name === name);
		return {
			name,
			state: status?.state ?? 'stopped',
			health: status?.health || null,
			ports: servicePorts(env.topology, name),
			address: serviceAddress(env.topology, env.paths, name),
		};
	});

	const components = await Promise.all(
		env.components().map(async (component) => {
			const state = liveState(env.paths, component.name);
			if (!state) return componentEntry(env, component, state, { ready: false, drift: false });
			const { env: resolved } = env.resolve(component);
			const ready = await isReady(readinessProbe(component, resolved));
			let drift = false;
			try {
				drift = supervisor.hash(component) !== state.envHash;
			} catch {
				drift = false;
			}
			return componentEntry(env, component, state, { ready, drift });
		}),
	);

	return {
		schemaVersion: STATUS_SCHEMA_VERSION,
		env: env.name,
		topology: describeTopology(env.topology),
		slot: env.topology.slot,
		source: env.repoRoot ?? null,
		urls: {
			editor: env.component('main-1') ? env.editorUrl('main-1') : null,
			mail: env.mailUrl() ?? null,
			public: env.tunnelUrl() ?? null,
		},
		services,
		components,
	};
}
