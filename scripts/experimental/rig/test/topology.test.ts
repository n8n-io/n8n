import { describe, expect, it } from 'vitest';
import { parseTopology, requiredServices } from '../src/config/env-yaml';
import { EnvPaths } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { resolveProcessEnv } from '../src/env/resolve';
import { RigError } from '../src/errors';
import {
	launcherComponents,
	portsOf,
	processComponents,
	startStages,
} from '../src/topology/components';
import { validateTopology } from '../src/topology/validate';

describe('presets', () => {
	it.each(Object.entries(PRESETS))('should produce a valid topology for %s', (name, preset) => {
		expect(() => validateTopology(parseTopology({ name, ...preset.topology }))).not.toThrow();
	});
});

describe('validateTopology', () => {
	it.each([
		[{ workers: 1 }, 'Workers need queue mode.'],
		[{ mains: 2 }, 'Multi-main needs queue mode.'],
		[{ queue: true }, 'Queue mode needs Postgres.'],
		[
			{ engine: 'in-process', db: 'postgres', queue: true },
			'Engine v2 in-process mode does not support queue mode',
		],
		[{ engine: 'in-process' }, 'Engine v2 needs Postgres'],
	])('should reject %j', (input, message) => {
		const topology = parseTopology({ name: 'x', ...input });
		expect(() => validateTopology(topology)).toThrow(RigError);
		expect(() => validateTopology(topology)).toThrow(message);
	});
});

describe('parseTopology', () => {
	it('should report the path of an invalid key', () => {
		expect(() => parseTopology({ name: 'x', mains: 0 })).toThrow('Invalid env.yaml at "mains"');
	});

	it('should reject unknown keys', () => {
		expect(() => parseTopology({ name: 'x', extra: true })).toThrow(RigError);
	});
});

describe('components', () => {
	const multiMain = parseTopology({ name: 'mm', ...PRESETS['multi-main'].topology, workers: 2 });

	it('should give each process its own port block', () => {
		const processes = processComponents(multiMain);
		expect(processes.map((p) => [p.name, p.ports.http, p.ports.broker])).toEqual([
			['main-1', 5678, 5679],
			['main-2', 5688, 5689],
			['worker-1', 5778, 5779],
			['worker-2', 5788, 5789],
		]);
	});

	it('should add launchers to mains only when they run tasks', () => {
		const processes = processComponents(multiMain);
		const offloading = launcherComponents(multiMain, processes, () => true);
		expect(offloading.map((l) => l.name)).toEqual(['launcher@worker-1', 'launcher@worker-2']);

		const notOffloading = launcherComponents(multiMain, processes, () => false);
		expect(notOffloading.map((l) => l.name)).toEqual([
			'launcher@main-1',
			'launcher@main-2',
			'launcher@worker-1',
			'launcher@worker-2',
		]);
	});

	it('should add no launchers in internal runner mode', () => {
		const topology = parseTopology({ name: 'x', runners: { mode: 'internal' } });
		expect(launcherComponents(topology, processComponents(topology), () => false)).toEqual([]);
	});

	it('should start main-1 first and launchers after their hosts', () => {
		const processes = processComponents(multiMain);
		const components = [...processes, ...launcherComponents(multiMain, processes, () => true)];
		expect(startStages(components).map((stage) => stage.map((c) => c.name))).toEqual([
			['main-1'],
			['main-2', 'worker-1', 'worker-2'],
			['launcher@worker-1', 'launcher@worker-2'],
		]);
	});

	it('should add the engine and the control plane port in remote mode', () => {
		const topology = parseTopology({ name: 'ev', ...PRESETS['enginev2-remote'].topology });
		const processes = processComponents(topology);
		expect(processes.map((p) => p.name)).toEqual(['main-1', 'worker-1', 'engine']);
		expect(portsOf(processes[0], topology)).toEqual([5678, 5679, 5684]);
		expect(portsOf(processes[2], topology)).toEqual([3000, 5879]);
		expect(requiredServices(topology)).toEqual(['postgres', 'redis']);
	});

	it('should give each main its own control plane port, and point the engine at main-1', () => {
		const topology = parseTopology({
			name: 'mm',
			...PRESETS['enginev2-remote'].topology,
			mains: 2,
		});
		expect(() => validateTopology(topology)).not.toThrow();
		const processes = processComponents(topology);
		const byName = (name: string) => processes.find((p) => p.name === name)!;
		const paths = new EnvPaths('/envs/mm');
		const env = (name: string) => resolveProcessEnv({ topology, paths }, byName(name)).env;

		expect(env('main-1').N8N_ENGINE_CONTROL_PLANE_PORT).toBe('5684');
		expect(env('main-2').N8N_ENGINE_CONTROL_PLANE_PORT).toBe('5694');
		expect(env('engine').N8N_ENGINE_CONTROL_PLANE_BASE_URL).toBe('http://127.0.0.1:5684');
		expect(env('worker-1').N8N_ENGINE_MODE).toBeUndefined();
	});

	it('should give the main the engine ports of its slot in in-process mode', () => {
		const topology = parseTopology({ name: 'ei', ...PRESETS['enginev2-local'].topology, slot: 2 });
		const [main] = processComponents(topology);
		expect(portsOf(main, topology)).toEqual(
			expect.arrayContaining([3020, 7684, main.ports.http, main.ports.broker]),
		);
	});
});
