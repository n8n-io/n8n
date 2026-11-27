import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
	ensureLayerFile,
	generatedSecretWarning,
	managedConflicts,
	resolveLayer,
} from '../src/commands/layers';
import { secretOverrideChecks } from '../src/commands/doctor';
import { parseTopology, saveTopology, type TopologyInput } from '../src/config/env-yaml';
import { envsDir, globalSecretsFile, profileFile } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { diffResolved } from '../src/env/resolve';
import { envPaths, RigEnv } from '../src/environment';
import { writeLicense } from '../src/licenses';
import { topologyWarnings } from '../src/topology/validate';

const LICENSE_KEY = '0b2c5a8e-1f3d-4c6b-9a7e-2d4f6b8c0e1a';

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

	it('should let more specific layers win over the secrets', () => {
		write(globalSecretsFile(), 'OPENAI_API_KEY=global\nANTHROPIC_API_KEY=global\n');
		write(profileFile('ai'), 'OPENAI_API_KEY=profile\nANTHROPIC_API_KEY=profile\n');
		const env = makeEnv('s', { ...PRESETS.queue.topology, profiles: ['ai'] });
		write(env.paths.secrets, 'ANTHROPIC_API_KEY=env\n');
		write(env.paths.layerFile('worker-1'), 'OPENAI_API_KEY=worker-1\n');
		const [main, worker] = env.processes();

		expect(env.resolve(main).env).toMatchObject({
			OPENAI_API_KEY: 'profile',
			ANTHROPIC_API_KEY: 'env',
		});
		expect(env.resolve(worker).env.OPENAI_API_KEY).toBe('worker-1');
	});

	it('should warn when a layer overrides a generated secret', () => {
		const env = makeEnv('s');
		write(env.paths.secrets, 'N8N_ENCRYPTION_KEY=generated\n');
		expect(generatedSecretWarning(env, 'shared', 'N8N_ENCRYPTION_KEY')).toMatch(
			/A value in env\/shared\.env overrides it\. n8n then cannot read the credentials/,
		);
		expect(generatedSecretWarning(env, 'secrets', 'N8N_ENCRYPTION_KEY')).toBeUndefined();
		expect(generatedSecretWarning(env, 'shared', 'OPENAI_API_KEY')).toBeUndefined();
	});

	it('should apply the license after the global secrets and before the profiles', () => {
		writeLicense('prod', {
			kind: 'activation-key',
			value: LICENSE_KEY,
			tenantId: '1',
			serverUrl: 'https://license.example.com',
		});
		write(globalSecretsFile(), 'N8N_LICENSE_TENANT_ID=9\nN8N_LICENSE_SERVER_URL=global\n');
		write(profileFile('staging'), 'N8N_LICENSE_SERVER_URL=https://staging.example.com\n');
		const env = makeEnv('l', { license: 'prod', profiles: ['staging'] });
		write(env.paths.layerFile('main'), 'N8N_LICENSE_TENANT_ID=3\n');
		const main = env.component('main-1');
		if (!main) throw new Error('no main');

		const { env: resolved, trace } = env.resolve(main);
		expect(resolved).toMatchObject({
			N8N_LICENSE_ACTIVATION_KEY: LICENSE_KEY,
			N8N_LICENSE_TENANT_ID: '3',
			N8N_LICENSE_SERVER_URL: 'https://staging.example.com',
		});
		expect(trace.get('N8N_LICENSE_TENANT_ID')?.map((s) => s.layer)).toEqual([
			'secrets',
			'license',
			'role',
		]);
		expect(trace.get('N8N_LICENSE_ACTIVATION_KEY')?.at(-1)?.label).toMatch(
			/licenses\/prod\.env:1$/,
		);
	});

	it('should not give the license to direct runners', () => {
		writeLicense('prod', { kind: 'activation-key', value: LICENSE_KEY, tenantId: '1' });
		const env = makeEnv('l', {
			license: 'prod',
			runners: { mode: 'external', via: 'direct', languages: ['js'] },
		});
		const runner = env.components().find((c) => c.kind === 'runner');
		if (!runner) throw new Error('no runner');
		expect(env.resolve(runner).env.N8N_LICENSE_ACTIVATION_KEY).toBeUndefined();
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

describe('secretOverrideChecks', () => {
	it('should warn when a layer overrides a value of secrets.env', () => {
		write(globalSecretsFile(), 'OPENAI_API_KEY=global\n');
		const env = makeEnv('d');
		write(env.paths.secrets, 'N8N_ENCRYPTION_KEY=generated\n');
		write(env.paths.layerFile('shared'), 'N8N_ENCRYPTION_KEY=old\nOPENAI_API_KEY=layer\n');

		const checks = secretOverrideChecks(env);
		expect(checks.map((c) => c.detail)).toEqual([
			'N8N_ENCRYPTION_KEY in env/shared.env:1 overrides secrets.env:1',
		]);
		expect(checks[0].hint).toContain('rig generated N8N_ENCRYPTION_KEY');
	});
});

describe('secretOverrideChecks with engine v2', () => {
	it('should not report the engine-v2 module that rig adds as a layer override', () => {
		const env = makeEnv('e', { ...PRESETS['enginev2-local'].topology });
		write(env.paths.secrets, 'N8N_ENABLED_MODULES=insights\n');
		expect(secretOverrideChecks(env)).toEqual([]);
	});
});

describe('license warnings', () => {
	function warningsOf(env: RigEnv): string[] {
		const main = env.component('main-1');
		if (!main || main.kind !== 'process') throw new Error('no main');
		return topologyWarnings(env.topology, env.resolve(main));
	}

	it('should warn when the license of the environment does not exist', () => {
		const env = makeEnv('w', { license: 'gone' });
		expect(warningsOf(env)).toEqual([expect.stringContaining('License "gone" does not exist.')]);
	});

	it('should warn when multi-main has no license', () => {
		const env = makeEnv('w', { ...PRESETS['multi-main'].topology });
		expect(warningsOf(env)).toEqual([expect.stringContaining('Multi-main needs a license.')]);
	});

	it('should warn when another layer sets the license key of the other kind', () => {
		writeLicense('prod', { kind: 'activation-key', value: LICENSE_KEY, tenantId: '1' });
		write(globalSecretsFile(), 'N8N_LICENSE_CERT=abc\n');
		const env = makeEnv('w', { ...PRESETS['multi-main'].topology, license: 'prod' });
		expect(warningsOf(env)).toEqual([
			expect.stringMatching(
				/^N8N_LICENSE_CERT comes from .*secrets\.env:1, not from license "prod"/,
			),
		]);
	});

	it('should not warn for a valid license setup', () => {
		writeLicense('prod', { kind: 'activation-key', value: LICENSE_KEY, tenantId: '1' });
		const env = makeEnv('w', { ...PRESETS['multi-main'].topology, license: 'prod' });
		expect(warningsOf(env)).toEqual([]);
	});
});
