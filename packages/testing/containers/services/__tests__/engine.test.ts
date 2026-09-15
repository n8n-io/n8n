import { describe, expect, test } from 'vitest';

import { applyEngineEnv } from '../engine';

const postgresEnv: Record<string, string> = {
	DB_TYPE: 'postgresdb',
	DB_POSTGRESDB_HOST: 'postgres',
	DB_POSTGRESDB_PORT: '5432',
	DB_POSTGRESDB_DATABASE: 'n8n_db',
	DB_POSTGRESDB_USER: 'n8n_user',
	DB_POSTGRESDB_PASSWORD: 'test_password',
};

describe('applyEngineEnv', () => {
	test('leaves the env untouched when no engine mode is set', () => {
		const env = { ...postgresEnv };

		applyEngineEnv(env, { engine: undefined, isQueueMode: false });

		expect(env).toEqual(postgresEnv);
	});

	test('enables the engine-v2 module', () => {
		const env = { ...postgresEnv };

		applyEngineEnv(env, { engine: 'in-process', isQueueMode: false });

		expect(env.N8N_ENABLED_MODULES).toBe('engine-v2');
	});

	test('keeps modules the caller already enabled', () => {
		const env = { ...postgresEnv, N8N_ENABLED_MODULES: 'insights,engine-v2' };

		applyEngineEnv(env, { engine: 'in-process', isQueueMode: false });

		expect(env.N8N_ENABLED_MODULES).toBe('insights,engine-v2');
	});

	test('points the data plane at the stack database', () => {
		const env = { ...postgresEnv };

		applyEngineEnv(env, { engine: 'in-process', isQueueMode: false });

		expect(env.N8N_ENGINE_DATABASE_URL).toBe(
			'postgres://n8n_user:test_password@postgres:5432/n8n_db',
		);
	});

	test('rejects a stack without Postgres', () => {
		const env: Record<string, string> = { DB_TYPE: 'sqlite' };

		expect(() => applyEngineEnv(env, { engine: 'in-process', isQueueMode: false })).toThrow(
			/Postgres/,
		);
	});

	test('rejects an env that is missing Postgres connection values', () => {
		const env: Record<string, string> = { DB_TYPE: 'postgresdb', DB_POSTGRESDB_HOST: 'postgres' };

		expect(() => applyEngineEnv(env, { engine: 'in-process', isQueueMode: false })).toThrow(
			/missing DB_POSTGRESDB_USER, DB_POSTGRESDB_PASSWORD, DB_POSTGRESDB_PORT, DB_POSTGRESDB_DATABASE/,
		);
	});

	test('rejects queue mode', () => {
		const env = { ...postgresEnv };

		expect(() => applyEngineEnv(env, { engine: 'in-process', isQueueMode: true })).toThrow(
			/queue mode/,
		);
	});
});
