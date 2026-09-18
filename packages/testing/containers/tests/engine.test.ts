import { describe, expect, test } from 'vitest';

import {
	applyEngineEnv,
	assertEngineSupported,
	ENGINE_AUTH_SECRET,
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

describe('applyEngineEnv', () => {
	test('leaves the env untouched when no engine mode is set', () => {
		const env = { ...postgresEnv };

		applyEngineEnv(env, { engine: undefined, isQueueMode: false, projectName });

		expect(env).toEqual(postgresEnv);
	});

	describe('in-process', () => {
		test('enables the engine-v2 module', () => {
			const env = { ...postgresEnv };

			applyEngineEnv(env, { engine: 'in-process', isQueueMode: false, projectName });

			expect(env.N8N_ENABLED_MODULES).toBe('engine-v2');
		});

		test('keeps modules the caller already enabled', () => {
			const env = { ...postgresEnv, N8N_ENABLED_MODULES: 'insights,engine-v2' };

			applyEngineEnv(env, { engine: 'in-process', isQueueMode: false, projectName });

			expect(env.N8N_ENABLED_MODULES).toBe('insights,engine-v2');
		});

		test('points the data plane at its own database on the stack Postgres', () => {
			const env = { ...postgresEnv };

			applyEngineEnv(env, { engine: 'in-process', isQueueMode: false, projectName });

			expect(env.N8N_ENGINE_DATABASE_URL).toBe(
				`postgres://n8n_user:test_password@postgres:5432/${ENGINE_DATABASE}`,
			);
		});

		test('keeps an explicit data plane database URL', () => {
			const env = { ...postgresEnv, N8N_ENGINE_DATABASE_URL: 'postgres://engine-postgres/db' };

			applyEngineEnv(env, { engine: 'in-process', isQueueMode: false, projectName });

			expect(env.N8N_ENGINE_DATABASE_URL).toBe('postgres://engine-postgres/db');
		});

		test('leaves the mode unset so the module hosts the data plane', () => {
			const env = { ...postgresEnv };

			applyEngineEnv(env, { engine: 'in-process', isQueueMode: false, projectName });

			expect(env.N8N_ENGINE_MODE).toBeUndefined();
		});
	});

	describe('container', () => {
		const containerEnv = (): Record<string, string> => {
			// Annotated: an inline spread of a plain Record narrows to the literal
			// key added here, which then loses the mutation applyEngineEnv makes.
			const env: Record<string, string> = {
				...postgresEnv,
				N8N_ENGINE_DATABASE_URL: 'postgres://engine-postgres/db',
			};
			applyEngineEnv(env, { engine: 'container', isQueueMode: false, projectName });
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

		test('opens the control plane server to the engine container', () => {
			expect(containerEnv().N8N_ENGINE_CONTROL_PLANE_HOST).toBe('0.0.0.0');
		});

		test('shares the secret both planes verify against', () => {
			expect(containerEnv().N8N_ENGINE_AUTH_SECRET).toBe(ENGINE_AUTH_SECRET);
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
			applyEngineEnv(env, { engine: 'in-process', isQueueMode: false, projectName }),
		).toThrow(/set `postgres: true`/);
	});

	test('rejects an env that is missing Postgres connection values', () => {
		// Every key the URL reads, so dropping one from the check fails here.
		const env: Record<string, string> = { DB_TYPE: 'postgresdb' };

		expect(() =>
			applyEngineEnv(env, { engine: 'in-process', isQueueMode: false, projectName }),
		).toThrow(
			/missing DB_POSTGRESDB_USER, DB_POSTGRESDB_PASSWORD, DB_POSTGRESDB_HOST, DB_POSTGRESDB_PORT/,
		);
	});

	test('rejects queue mode', () => {
		const env = { ...postgresEnv };

		expect(() =>
			applyEngineEnv(env, { engine: 'container', isQueueMode: true, projectName }),
		).toThrow(/queue mode/);
	});
});

describe('engineContainerEnv', () => {
	test('has no control plane database access', () => {
		const env = engineContainerEnv(postgresEnv, { projectName });

		expect(Object.keys(env).filter((key) => key.startsWith('DB_'))).toEqual([]);
	});

	test('has no encryption key, since it holds no credential store', () => {
		expect(engineContainerEnv(postgresEnv, { projectName }).N8N_ENCRYPTION_KEY).toBeUndefined();
	});

	test('keeps the rest of the shared env', () => {
		expect(engineContainerEnv(postgresEnv, { projectName }).N8N_LOG_LEVEL).toBe('debug');
	});

	test('builds the data plane database URL from the Postgres values before dropping them', () => {
		expect(engineContainerEnv(postgresEnv, { projectName }).N8N_ENGINE_DATABASE_URL).toBe(
			`postgres://n8n_user:test_password@postgres:5432/${ENGINE_DATABASE}`,
		);
	});

	test('keeps an explicit data plane database URL', () => {
		const env = engineContainerEnv(
			{ ...postgresEnv, N8N_ENGINE_DATABASE_URL: 'postgres://engine-postgres/db' },
			{ projectName },
		);

		expect(env.N8N_ENGINE_DATABASE_URL).toBe('postgres://engine-postgres/db');
	});

	test('dials the control plane server on the main', () => {
		expect(engineContainerEnv(postgresEnv, { projectName }).N8N_ENGINE_CONTROL_PLANE_BASE_URL).toBe(
			'http://proj-n8n:3001',
		);
	});

	test('shares the secret both planes verify against', () => {
		expect(engineContainerEnv(postgresEnv, { projectName }).N8N_ENGINE_AUTH_SECRET).toBe(
			ENGINE_AUTH_SECRET,
		);
	});

	test('runs its own task runner, since the external one is bound to the main', () => {
		expect(engineContainerEnv(postgresEnv, { projectName }).N8N_RUNNERS_MODE).toBe('internal');
	});

	test('rejects an env that is missing Postgres connection values', () => {
		expect(() => engineContainerEnv({ DB_TYPE: 'postgresdb' }, { projectName })).toThrow(
			/missing DB_POSTGRESDB_USER/,
		);
	});
});

describe('assertEngineSupported', () => {
	// `createN8NStack` calls this for every stack, so the no-op keeps the stacks
	// that do not run engine 2.0 starting at all.
	test('accepts any stack that does not run engine 2.0', () => {
		expect(() =>
			assertEngineSupported({ engine: undefined, isQueueMode: true, usePostgres: false }),
		).not.toThrow();
	});
});
