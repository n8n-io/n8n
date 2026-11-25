import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { vscodeConfigurations } from '../src/commands/tools';
import { parseTopology, saveTopology, type TopologyInput } from '../src/config/env-yaml';
import { envsDir, EnvPaths } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { resolveProcessEnv } from '../src/env/resolve';
import { envPaths, RigEnv } from '../src/environment';
import { RigError } from '../src/errors';
import { readinessProbe } from '../src/runtime/health';
import { inspectAddress } from '../src/runtime/supervisor';
import { processComponents } from '../src/topology/components';
import { validateTopology } from '../src/topology/validate';

function makeEnv(name: string, input: Omit<TopologyInput, 'name'>): RigEnv {
	const paths = envPaths(name);
	mkdirSync(paths.layersDir, { recursive: true });
	saveTopology(paths.envYaml, parseTopology({ name, ...input }));
	writeFileSync(paths.secrets, 'N8N_RUNNERS_AUTH_TOKEN=token\n');
	return new RigEnv(name, paths);
}

afterEach(() => {
	rmSync(envsDir(), { recursive: true, force: true });
});

const direct: Omit<TopologyInput, 'name'> = {
	runners: { mode: 'external', via: 'direct', languages: ['js', 'python'] },
};

describe('direct runners', () => {
	it('should run one runner per language and task host, without launchers', () => {
		const env = makeEnv('d', { ...PRESETS.queue.topology, ...direct });
		expect(env.launchers()).toEqual([]);
		// In queue mode the main offloads manual executions, so only the worker runs tasks.
		expect(env.runners().map((r) => r.name)).toEqual(['runner-js@worker-1', 'runner-py@worker-1']);
		expect(env.select('runner-js').map((c) => c.name)).toEqual(['runner-js@worker-1']);
		expect(env.affectedBy('runner-py').map((c) => c.name)).toEqual(['runner-py@worker-1']);
		expect(env.affectedBy('runner-js@worker-1').map((c) => c.name)).toEqual(['runner-js@worker-1']);
	});

	it('should restart the runners of a process with it', () => {
		const env = makeEnv('d', direct);
		const main = env.component('main-1');
		if (!main) throw new Error('no main');
		expect(env.withDependentRunners([main]).map((c) => c.name)).toEqual([
			'main-1',
			'runner-js@main-1',
			'runner-py@main-1',
		]);
	});

	it('should give a runner the broker, its health port, and only the allowed shared keys', () => {
		const env = makeEnv('d', direct);
		writeFileSync(
			env.paths.layerFile('shared'),
			'GENERIC_TIMEZONE=Europe/Berlin\nN8N_LOG_LEVEL=debug\n',
		);
		writeFileSync(env.paths.layerFile('runner-js'), 'NODE_FUNCTION_ALLOW_BUILTIN=*\n');
		const runner = env.component('runner-js@main-1');
		if (!runner) throw new Error('no runner');
		const resolved = env.resolve(runner).env;
		expect(resolved).toMatchObject({
			N8N_RUNNERS_TASK_BROKER_URI: 'http://127.0.0.1:5679',
			N8N_RUNNERS_HEALTH_CHECK_SERVER_ENABLED: 'true',
			N8N_RUNNERS_HEALTH_CHECK_SERVER_PORT: '5681',
			GENERIC_TIMEZONE: 'Europe/Berlin',
			NODE_FUNCTION_ALLOW_BUILTIN: '*',
			N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT: '0',
		});
		expect(resolved.N8N_LOG_LEVEL).toBeUndefined();
		expect(resolved.N8N_RUNNERS_AUTH_TOKEN).toBeUndefined();
		// Launcher-only defaults stay with the launcher.
		expect(resolved.N8N_RUNNERS_LAUNCHER_LOG_LEVEL).toBeUndefined();
		expect(readinessProbe(runner, resolved).url).toBe('http://127.0.0.1:5681/healthz');
	});
});

describe('readiness probe', () => {
	it('should use the ports of the resolved env', () => {
		const env = makeEnv('p', PRESETS.queue.topology).withOverrides({
			oneOff: { N8N_PORT: '15678', QUEUE_HEALTH_CHECK_PORT: '15778' },
		});
		const main = env.component('main-1');
		const worker = env.component('worker-1');
		if (!main || !worker) throw new Error('no main or worker');
		expect(readinessProbe(main, env.resolve(main).env).url).toBe(
			'http://127.0.0.1:15678/healthz/readiness',
		);
		expect(readinessProbe(worker, env.resolve(worker).env).url).toBe(
			'http://127.0.0.1:15778/healthz/readiness',
		);
	});
});

describe('env hash', () => {
	it('should ignore one-off values and the parent shell, and see env file changes', () => {
		const env = makeEnv('h', {});
		const main = env.component('main-1');
		if (!main) throw new Error('no main');
		const hash = env.componentHash(main);
		expect(env.componentHash(main, { oneOff: { N8N_LOG_LEVEL: 'debug' }, inheritEnv: true })).toBe(
			hash,
		);
		writeFileSync(env.paths.layerFile('main'), 'N8N_LOG_LEVEL=debug\n');
		expect(env.reload().componentHash(main)).not.toBe(hash);
	});
});

describe('task hosts in queue mode', () => {
	it('should give launchers only to workers in the queue presets', () => {
		for (const preset of ['queue', 'multi-main'] as const) {
			const env = makeEnv(preset, PRESETS[preset].topology);
			expect(env.launchers().map((l) => l.name)).toEqual(['launcher@worker-1']);
			const main = env.component('main-1');
			if (!main) throw new Error('no main');
			expect(
				env.resolve(main).trace.get('OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS')?.at(-1),
			).toMatchObject({
				layer: 'default',
				value: 'true',
			});
		}
	});

	it('should give a main its launcher back when it does not offload', () => {
		const env = makeEnv('q', PRESETS.queue.topology);
		writeFileSync(env.paths.layerFile('main'), 'OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=false\n');
		expect(env.launchers().map((l) => l.name)).toEqual(['launcher@main-1', 'launcher@worker-1']);
	});

	it('should give a main its launcher when a one-off value turns off offloading', () => {
		const env = makeEnv('q', PRESETS.queue.topology).withOverrides({
			oneOff: { OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS: 'false' },
		});
		expect(env.runnerHosts().map((l) => l.name)).toEqual(['launcher@main-1', 'launcher@worker-1']);
		expect(
			env
				.reload()
				.runnerHosts()
				.map((l) => l.name),
		).toContain('launcher@main-1');
	});

	it('should set the default in regular mode too, where the main keeps its launcher', () => {
		const env = makeEnv('r', {});
		const main = env.component('main-1');
		if (!main) throw new Error('no main');
		expect(env.resolve(main).env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS).toBe('true');
		expect(env.launchers().map((l) => l.name)).toEqual(['launcher@main-1']);
	});
});

describe('engine TLS', () => {
	it('should need engine remote', () => {
		expect(() =>
			validateTopology(parseTopology({ name: 't', db: 'postgres', engineTls: true })),
		).toThrow(RigError);
	});

	it('should give each plane its certificate and use https between them', () => {
		const topology = parseTopology({
			name: 't',
			...PRESETS['enginev2-remote'].topology,
			engineTls: true,
		});
		const paths = new EnvPaths('/envs/t');
		const processes = processComponents(topology);
		const main = processes.find((p) => p.name === 'main-1')!;
		const engine = processes.find((p) => p.name === 'engine')!;
		const mainEnv = resolveProcessEnv({ topology, paths }, main).env;
		const engineEnv = resolveProcessEnv({ topology, paths }, engine).env;

		expect(mainEnv).toMatchObject({
			N8N_ENGINE_BASE_URL: 'https://127.0.0.1:3000',
			N8N_ENGINE_TLS_CERT_FILE: '/envs/t/engine-tls/main.crt',
			N8N_ENGINE_TLS_CA_FILE: '/envs/t/engine-tls/ca.crt',
		});
		expect(engineEnv).toMatchObject({
			N8N_ENGINE_CONTROL_PLANE_BASE_URL: 'https://127.0.0.1:5684',
			N8N_ENGINE_TLS_KEY_FILE: '/envs/t/engine-tls/engine.key',
		});
		expect(mainEnv.N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP).toBeUndefined();
		expect(readinessProbe(engine, engineEnv)).toEqual({
			url: 'https://127.0.0.1:3000/healthz',
			caFile: '/envs/t/engine-tls/ca.crt',
		});
	});

	it('should allow plain HTTP without TLS', () => {
		const topology = parseTopology({ name: 't', ...PRESETS['enginev2-remote'].topology });
		const [main] = processComponents(topology);
		const mainEnv = resolveProcessEnv({ topology, paths: new EnvPaths('/envs/t') }, main).env;
		expect(mainEnv.N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP).toBe('true');
		expect(mainEnv.N8N_ENGINE_BASE_URL).toBe('http://127.0.0.1:3000');
	});
});

describe('debugging', () => {
	it('should put the inspector at offset +5 of the port block', () => {
		const [main, worker] = processComponents(
			parseTopology({ name: 'q', ...PRESETS.queue.topology }),
		);
		expect(inspectAddress(main)).toBe('127.0.0.1:5683');
		expect(inspectAddress(worker)).toBe('127.0.0.1:5783');
	});

	it('should print a launch and an attach configuration for VS Code', () => {
		const [, worker] = processComponents(parseTopology({ name: 'q', ...PRESETS.queue.topology }));
		const [launch, attach] = vscodeConfigurations('q', worker, '/repo', { A: '1' });
		expect(launch).toMatchObject({
			type: 'node',
			request: 'launch',
			name: 'rig: q worker-1',
			cwd: '/repo/packages/cli',
			program: '/repo/packages/cli/bin/n8n',
			args: ['worker'],
			env: { A: '1' },
		});
		expect(attach).toMatchObject({ request: 'attach', port: 5783 });
	});
});
