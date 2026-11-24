import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { ensureLayerFile, managedConflicts, resolveLayer } from '../src/commands/layers';
import { parseTopology, saveTopology, type TopologyInput } from '../src/config/env-yaml';
import { envsDir, globalSecretsFile, profileFile } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { diffResolved } from '../src/env/resolve';
import { envPaths, RigEnv } from '../src/environment';

function makeEnv(name: string, input: Omit<TopologyInput, 'name'> = {}): RigEnv {
	const paths = envPaths(name);
	mkdirSync(paths.layersDir, { recursive: true });
	saveTopology(paths.envYaml, parseTopology({ name, ...input }));
	writeFileSync(paths.secrets, '');
	return new RigEnv(name, paths);
}

function write(file: string, text: string) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, text);
}

afterEach(() => {
	rmSync(envsDir(), { recursive: true, force: true });
	rmSync(dirname(globalSecretsFile()), { recursive: true, force: true });
});

describe('profiles', () => {
	it('should apply profiles in order, after the managed vars and before shared.env', () => {
		write(profileFile('debug'), 'N8N_LOG_LEVEL=debug\nA=from-debug\n');
		write(profileFile('loud'), 'A=from-loud\nB=from-loud\n');
		const env = makeEnv('p', { profiles: ['debug', 'loud'] });
		write(env.paths.layerFile('shared'), 'B=from-shared\n');

		const main = env.component('main-1');
		if (!main) throw new Error('no main');
		const { env: resolved, trace } = env.resolve(main);
		expect(resolved).toMatchObject({ N8N_LOG_LEVEL: 'debug', A: 'from-loud', B: 'from-shared' });
		expect(trace.get('A')?.map((s) => s.layer)).toEqual(['profile', 'profile']);
		expect(trace.get('A')?.at(-1)?.label).toMatch(/profiles\/loud\.env:1$/);
	});

	it('should not apply a profile that is off', () => {
		write(profileFile('debug'), 'N8N_LOG_LEVEL=debug\n');
		const env = makeEnv('p');
		const main = env.component('main-1');
		if (!main) throw new Error('no main');
		expect(env.resolve(main).env.N8N_LOG_LEVEL).toBe('info');
		expect(env.affectedBy('profile:debug')).toEqual([]);
	});

	it('should accept a new profile as a layer target and create its file', () => {
		const env = makeEnv('p');
		expect(resolveLayer(env, 'profile:fresh')).toBe('profile:fresh');
		expect(ensureLayerFile(env, 'profile:fresh')).toBe(profileFile('fresh'));
		expect(env.layerTargets()).toContain('profile:fresh');
		expect(() => resolveLayer(env, 'profile:Bad Name')).toThrow('Unknown layer');
	});
});

describe('secrets', () => {
	it('should let the secrets of the environment win over the global secrets', () => {
		write(globalSecretsFile(), 'LICENSE=global\nONLY_GLOBAL=1\n');
		const env = makeEnv('s');
		write(env.paths.secrets, 'LICENSE=local\n');
		const main = env.component('main-1');
		if (!main) throw new Error('no main');
		const { env: resolved, trace } = env.resolve(main);
		expect(resolved).toMatchObject({ LICENSE: 'local', ONLY_GLOBAL: '1' });
		expect(trace.get('LICENSE')?.map((s) => s.layer)).toEqual(['secrets', 'secrets']);
	});

	it('should create secret files with mode 0600', () => {
		const env = makeEnv('s');
		expect(statSync(ensureLayerFile(env, 'global-secrets')).mode & 0o777).toBe(0o600);
		expect(env.layerLabel('secrets')).toBe('secrets.env');
		expect(env.affectedBy('global-secrets').map((c) => c.name)).toEqual(
			env.components().map((c) => c.name),
		);
	});
});

describe('env diff', () => {
	it('should list keys that differ and skip keys from the shell', () => {
		const env = makeEnv('q', PRESETS.queue.topology);
		const [main, worker] = env.processes();
		const differences = diffResolved(env.resolve(main), env.resolve(worker));
		const keys = differences.map((d) => d.key);
		expect(keys).toContain('N8N_PORT');
		expect(keys).toContain('QUEUE_HEALTH_CHECK_PORT');
		expect(keys).not.toContain('PATH');
		expect(differences.find((d) => d.key === 'N8N_PORT')?.b).toBeUndefined();
	});
});

describe('managedConflicts', () => {
	it('should check the runner env of a launcher for a runner layer', () => {
		const env = makeEnv('r');
		const [launcher] = env.launchers();
		expect(managedConflicts(env, `runner-py@${launcher.host.name}`, 'PYTHONPATH')).toEqual([
			{
				component: `runner-py@${launcher.host.name}`,
				value: expect.stringContaining('task-runner-python'),
			},
		]);
	});
});
