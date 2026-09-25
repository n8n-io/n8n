import { describe, expect, test } from 'vitest';

import {
	applyEngineEnv,
	assertEngineSupported,
	ENGINE_DATABASE,
	engineContainerEnv,
} from '../services/engine';

const postgresEnv: Record<string, string> = {
	DB_TYPE: 'postgresdb',
	DB_POSTGRESDB_HOST: 'postgres',
	DB_POSTGRESDB_PORT: '5432',
	DB_POSTGRESDB_DATABASE: 'n8n_db',
	DB_POSTGRESDB_USER: 'n8n_user',
	DB_POSTGRESDB_PASSWORD: 'test_password',
	N8N_ENCRYPTION_KEY: 'test-encryption-key',
	N8N_LOG_LEVEL: 'debug',
	N8N_RUNNERS_MODE: 'external',
};

const projectName = 'proj';
const authSecret = 'test-stack-secret'.repeat(3);
const engineOptions = { projectName, authSecret };
const dedicatedEngineEnv = {
	...postgresEnv,
	N8N_ENGINE_DATABASE_URL:
		'postgres://engine_user:engine_test_password@engine-postgres:5432/n8n_engine',
};

describe('applyEngineEnv', () => {
	test('leaves the env untouched when no engine mode is set', () => {
		const env = { ...postgresEnv };

		applyEngineEnv(env, { engine: undefined, mains: 1, isQueueMode: false, projectName });

		expect(env).toEqual(postgresEnv);
	});

	describe('in-process', () => {
		test('enables the engine-v2 module', () => {
			const env = { ...postgresEnv };

			applyEngineEnv(env, { engine: 'in-process', mains: 1, isQueueMode: false, projectName });

			expect(env.N8N_ENABLED_MODULES).toBe('engine-v2');
		});

		test('keeps modules the caller already enabled', () => {
			const env = { ...postgresEnv, N8N_ENABLED_MODULES: 'insights,engine-v2' };

			applyEngineEnv(env, { engine: 'in-process', mains: 1, isQueueMode: false, projectName });

			expect(env.N8N_ENABLED_MODULES).toBe('insights,engine-v2');
		});

		test('points the data plane at its own database on the stack Postgres', () => {
			const env = { ...postgresEnv };

			applyEngineEnv(env, { engine: 'in-process', mains: 1, isQueueMode: false, projectName });

			expect(env.N8N_ENGINE_DATABASE_URL).toBe(
				`postgres://n8n_user:test_password@postgres:5432/${ENGINE_DATABASE}`,
			);
		});

		test('keeps an explicit data plane database URL', () => {
			const env = { ...postgresEnv, N8N_ENGINE_DATABASE_URL: 'postgres://engine-postgres/db' };

			applyEngineEnv(env, { engine: 'in-process', mains: 1, isQueueMode: false, projectName });

			expect(env.N8N_ENGINE_DATABASE_URL).toBe('postgres://engine-postgres/db');
		});

		test('leaves the mode unset so the module hosts the data plane', () => {
			const env = { ...postgresEnv };

			applyEngineEnv(env, { engine: 'in-process', mains: 1, isQueueMode: false, projectName });

			expect(env.N8N_ENGINE_MODE).toBeUndefined();
		});
	});

	describe('container', () => {
		const containerEnv = (): Record<string, string> => {
			const env: Record<string, string> = {
				...postgresEnv,
				N8N_ENGINE_DATABASE_URL: 'postgres://engine-postgres/db',
			};
			applyEngineEnv(env, { engine: 'container', mains: 1, isQueueMode: false, ...engineOptions });
			return env;
		};

		test('enables the engine-v2 module in remote mode', () => {
			expect(containerEnv()).toMatchObject({
				N8N_ENABLED_MODULES: 'engine-v2',
				N8N_ENGINE_MODE: 'remote',
			});
		});

		test('points the main at the engine container', () => {
			expect(containerEnv().N8N_ENGINE_BASE_URL).toBe('http://proj-n8n-engine:3000');
		});

		test('opens the control plane server to the engine container on the stack port', () => {
			expect(containerEnv()).toMatchObject({
				N8N_ENGINE_CONTROL_PLANE_HOST: '0.0.0.0',
				N8N_ENGINE_CONTROL_PLANE_PORT: '3001',
			});
		});

		test('keeps the control plane port the engine dials, whatever the caller set', () => {
			const env: Record<string, string> = { ...postgresEnv, N8N_ENGINE_CONTROL_PLANE_PORT: '4001' };
			applyEngineEnv(env, { engine: 'container', mains: 1, isQueueMode: false, ...engineOptions });

			expect(env.N8N_ENGINE_CONTROL_PLANE_PORT).toBe('3001');
		});

		test('shares the secret both planes verify against', () => {
			expect(containerEnv().N8N_ENGINE_AUTH_SECRET).toBe(authSecret);
		});

		test('gives the main no data plane database, even when a service provided one', () => {
			expect(containerEnv().N8N_ENGINE_DATABASE_URL).toBeUndefined();
		});
	});

	test('rejects a stack without Postgres', () => {
		const env: Record<string, string> = { DB_TYPE: 'sqlite' };

		// The connection-env error also says "Postgres", so match what only this
		// error says. Otherwise the test passes when the guard is gone.
		expect(() =>
			applyEngineEnv(env, { engine: 'in-process', mains: 1, isQueueMode: false, projectName }),
		).toThrow(/set `postgres: true`/);
	});

	test('rejects an env that is missing Postgres connection values', () => {
		// Every key the URL reads, so dropping one from the check fails here.
		const env: Record<string, string> = { DB_TYPE: 'postgresdb' };

		expect(() =>
			applyEngineEnv(env, { engine: 'in-process', mains: 1, isQueueMode: false, projectName }),
		).toThrow(
			/missing DB_POSTGRESDB_USER, DB_POSTGRESDB_PASSWORD, DB_POSTGRESDB_HOST, DB_POSTGRESDB_PORT/,
		);
	});

	test('rejects queue mode', () => {
		const env = { ...postgresEnv };

		expect(() =>
			applyEngineEnv(env, { engine: 'container', mains: 1, isQueueMode: true, ...engineOptions }),
		).toThrow(/queue mode/);
	});

	test('rejects a stack without a main, since the engine would be started as one', () => {
		const env = { ...postgresEnv };

		expect(() =>
			applyEngineEnv(env, { engine: 'container', mains: 0, isQueueMode: false, ...engineOptions }),
		).toThrow(/exactly one main/);
	});
});

describe('engineContainerEnv', () => {
	test('has no control plane database access', () => {
		const env = engineContainerEnv(dedicatedEngineEnv, engineOptions);

		expect(Object.keys(env).filter((key) => key.startsWith('DB_'))).toEqual([]);
	});

	test('has no encryption key, since it holds no credential store', () => {
		expect(
			engineContainerEnv(dedicatedEngineEnv, engineOptions).N8N_ENCRYPTION_KEY,
		).toBeUndefined();
	});

	test('keeps the rest of the shared env', () => {
		expect(engineContainerEnv(dedicatedEngineEnv, engineOptions).N8N_LOG_LEVEL).toBe('debug');
	});

	test('requires a dedicated data plane database URL', () => {
		expect(() => engineContainerEnv(postgresEnv, engineOptions)).toThrow(/N8N_ENGINE_DATABASE_URL/);
	});

	test('keeps an explicit data plane database URL', () => {
		const env = engineContainerEnv(
			{ ...postgresEnv, N8N_ENGINE_DATABASE_URL: 'postgres://engine-postgres/db' },
			engineOptions,
		);

		expect(env.N8N_ENGINE_DATABASE_URL).toBe('postgres://engine-postgres/db');
	});

	test('dials the control plane server on the main', () => {
		expect(
			engineContainerEnv(dedicatedEngineEnv, engineOptions).N8N_ENGINE_CONTROL_PLANE_BASE_URL,
		).toBe('http://proj-n8n:3001');
	});

	test('shares the secret both planes verify against', () => {
		expect(engineContainerEnv(dedicatedEngineEnv, engineOptions).N8N_ENGINE_AUTH_SECRET).toBe(
			authSecret,
		);
	});

	test('serves on the address the main dials and the stack probes, whatever the caller set', () => {
		const env = engineContainerEnv(
			{ ...dedicatedEngineEnv, N8N_ENGINE_HOST: '127.0.0.1', N8N_ENGINE_PORT: '4000' },
			engineOptions,
		);

		expect(env.N8N_ENGINE_HOST).toBe('0.0.0.0');
		expect(env.N8N_ENGINE_PORT).toBe('3000');
	});
});

describe('assertEngineSupported', () => {
	// `createN8NStack` calls this for every stack, so the no-op keeps the stacks
	// that do not run engine v2 starting at all.
	test('accepts any stack that does not run engine v2', () => {
		expect(() =>
			assertEngineSupported({ engine: undefined, mains: 0, isQueueMode: true, usePostgres: false }),
		).not.toThrow();
	});
});
