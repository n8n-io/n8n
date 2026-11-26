import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseTopology, type TopologyInput } from '../src/config/env-yaml';
import { EnvPaths } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { resolveLauncherEnv, resolveProcessEnv, resolveRunnerEnv } from '../src/env/resolve';
import { launcherComponents, processComponents } from '../src/topology/components';

let root: string;
let paths: EnvPaths;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'rig-test-'));
	paths = new EnvPaths(root);
	mkdirSync(paths.layersDir, { recursive: true });
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

function layer(name: string, text: string) {
	writeFileSync(paths.layerFile(name), text);
}

function setup(input: Omit<TopologyInput, 'name'>) {
	const topology = parseTopology({ name: 't', ...input });
	const ctx = { topology, paths, repoRoot: '/repo' };
	const processes = processComponents(topology);
	const byName = (name: string) => {
		const component = processes.find((p) => p.name === name);
		if (!component) throw new Error(`no ${name}`);
		return component;
	};
	return { ctx, processes, byName, topology };
}

describe('resolveProcessEnv', () => {
	it('should apply layers in order: default < managed < secrets < shared < role < component < one-off', () => {
		const { ctx, byName } = setup(PRESETS.queue.topology);
		layer('shared', 'N8N_LOG_LEVEL=warn\nA=shared\nB=shared\nC=shared\n');
		layer('worker', 'N8N_LOG_LEVEL=debug\nB=role\n');
		layer('worker-1', 'C=component\n');
		writeFileSync(paths.secrets, 'C=secret\nD=secret\n');

		const worker = resolveProcessEnv({ ...ctx, oneOff: { A: 'one-off' } }, byName('worker-1'));
		expect(worker.env).toMatchObject({
			N8N_LOG_LEVEL: 'debug',
			A: 'one-off',
			B: 'role',
			C: 'component',
			D: 'secret',
		});
		expect(worker.trace.get('C')?.map((s) => s.layer)).toEqual(['secrets', 'shared', 'component']);
		expect(worker.trace.get('N8N_LOG_LEVEL')?.map((s) => s.layer)).toEqual([
			'default',
			'shared',
			'role',
		]);
		expect(worker.trace.get('B')?.at(-1)?.label).toBe('env/worker.env:2');

		const main = resolveProcessEnv(ctx, byName('main-1'));
		expect(main.env.N8N_LOG_LEVEL).toBe('warn');
		expect(main.env.B).toBe('shared');
	});

	it('should wire Postgres, Redis, and ports for queue mode', () => {
		const { ctx, byName } = setup(PRESETS.queue.topology);
		const { env } = resolveProcessEnv(ctx, byName('worker-1'));
		expect(env).toMatchObject({
			DB_TYPE: 'postgresdb',
			DB_POSTGRESDB_PORT: '5432',
			EXECUTIONS_MODE: 'queue',
			QUEUE_BULL_REDIS_PORT: '6379',
			QUEUE_HEALTH_CHECK_ACTIVE: 'true',
			QUEUE_HEALTH_CHECK_PORT: '5778',
			N8N_RUNNERS_BROKER_PORT: '5779',
			N8N_RUNNERS_MODE: 'external',
			N8N_USER_FOLDER: paths.userFolder('worker-1'),
		});
		expect(env.N8N_PORT).toBeUndefined();
	});

	it('should keep engine-v2 when a layer sets other modules', () => {
		const { ctx, byName } = setup(PRESETS['enginev2-local'].topology);
		layer('shared', 'N8N_ENABLED_MODULES=instance-ai\n');
		const { env, trace } = resolveProcessEnv(ctx, byName('main-1'));
		expect(env.N8N_ENABLED_MODULES).toBe('instance-ai,engine-v2');
		expect(trace.get('N8N_ENABLED_MODULES')?.at(-1)?.label).toBe('rig (adds engine-v2)');
	});

	it('should keep control plane keys away from the remote engine', () => {
		const { ctx, byName } = setup(PRESETS['enginev2-remote'].topology);
		layer('shared', 'DB_LOGGING_ENABLED=true\nX=1\n');
		writeFileSync(
			paths.secrets,
			'N8N_ENCRYPTION_KEY=k\nN8N_ENGINE_AUTH_SECRET=s\nN8N_ENGINE_RESUME_SECRET=r\n',
		);

		const engine = resolveProcessEnv(ctx, byName('engine')).env;
		expect(engine.N8N_ENCRYPTION_KEY).toBeUndefined();
		expect(engine.DB_LOGGING_ENABLED).toBeUndefined();
		expect(engine).toMatchObject({
			X: '1',
			N8N_ENGINE_AUTH_SECRET: 's',
			N8N_ENGINE_RESUME_SECRET: 'r',
		});

		const main = resolveProcessEnv(ctx, byName('main-1')).env;
		expect(main.N8N_ENGINE_RESUME_SECRET).toBeUndefined();
		expect(main.N8N_ENGINE_DATABASE_URL).toBeUndefined();
		expect(main).toMatchObject({ N8N_ENGINE_MODE: 'remote', N8N_ENCRYPTION_KEY: 'k' });
	});

	it('should drop engine secrets when the engine is off', () => {
		const { ctx, byName } = setup(PRESETS.sqlite.topology);
		writeFileSync(paths.secrets, 'N8N_ENCRYPTION_KEY=k\nN8N_ENGINE_AUTH_SECRET=s\n');
		const { env } = resolveProcessEnv(ctx, byName('main-1'));
		expect(env.N8N_ENGINE_AUTH_SECRET).toBeUndefined();
		expect(env.N8N_ENCRYPTION_KEY).toBe('k');
	});

	it('should pass only safe parent shell keys unless inheritEnv is set', () => {
		const { ctx, byName } = setup(PRESETS.sqlite.topology);
		process.env.RIG_TEST_LEAK = 'x';
		try {
			expect(resolveProcessEnv(ctx, byName('main-1')).env.RIG_TEST_LEAK).toBeUndefined();
			expect(
				resolveProcessEnv({ ...ctx, inheritEnv: true }, byName('main-1')).env.RIG_TEST_LEAK,
			).toBe('x');
		} finally {
			delete process.env.RIG_TEST_LEAK;
		}
	});
});

describe('launcher and runner env', () => {
	it('should point the launcher at its host broker', () => {
		const { ctx, topology, processes } = setup(PRESETS.queue.topology);
		const [launcher] = launcherComponents(topology, processes, () => true);
		expect(launcher.name).toBe('launcher@worker-1');
		expect(resolveLauncherEnv(ctx, launcher).env).toMatchObject({
			N8N_RUNNERS_TASK_BROKER_URI: 'http://127.0.0.1:5779',
			N8N_RUNNERS_LAUNCHER_HEALTH_CHECK_PORT: '5780',
			N8N_RUNNERS_CONFIG_PATH: paths.launcherConfig('worker-1'),
		});
	});

	it('should merge runner layers with a host override on top', () => {
		const { ctx } = setup(PRESETS.queue.topology);
		layer('runner-js', 'NODE_FUNCTION_ALLOW_EXTERNAL=lodash\n');
		layer('runner-js@worker-1', 'NODE_FUNCTION_ALLOW_EXTERNAL=dayjs\n');
		expect(resolveRunnerEnv(ctx, 'main-1', 'runner-js').env.NODE_FUNCTION_ALLOW_EXTERNAL).toBe(
			'lodash',
		);
		expect(resolveRunnerEnv(ctx, 'worker-1', 'runner-js').env).toEqual({
			NODE_FUNCTION_ALLOW_BUILTIN: 'crypto',
			NODE_FUNCTION_ALLOW_EXTERNAL: 'dayjs',
		});
		expect(resolveRunnerEnv(ctx, 'worker-1', 'runner-py').env.PYTHONPATH).toBe(
			'/repo/packages/@n8n/task-runner-python',
		);
	});
});
