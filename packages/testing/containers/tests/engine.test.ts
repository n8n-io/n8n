import { describe, expect, test } from 'vitest';

import { applyEngineEnv, assertEngineSupported, ENGINE_DATABASE } from '../services/engine';

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

	test('points the data plane at its own database on the stack Postgres', () => {
		const env = { ...postgresEnv };

		applyEngineEnv(env, { engine: 'in-process', isQueueMode: false });

		expect(env.N8N_ENGINE_DATABASE_URL).toBe(
			`postgres://n8n_user:test_password@postgres:5432/${ENGINE_DATABASE}`,
		);
	});

	test('rejects a stack without Postgres', () => {
		const env: Record<string, string> = { DB_TYPE: 'sqlite' };

		// The connection-env error also says "Postgres", so match what only this
		// error says. Otherwise the test passes when the guard is gone.
		expect(() => applyEngineEnv(env, { engine: 'in-process', isQueueMode: false })).toThrow(
			/set `postgres: true`/,
		);
	});

	test('rejects an env that is missing Postgres connection values', () => {
		// Every key the URL reads, so dropping one from the check fails here.
		const env: Record<string, string> = { DB_TYPE: 'postgresdb' };

		expect(() => applyEngineEnv(env, { engine: 'in-process', isQueueMode: false })).toThrow(
			/missing DB_POSTGRESDB_USER, DB_POSTGRESDB_PASSWORD, DB_POSTGRESDB_HOST, DB_POSTGRESDB_PORT/,
		);
	});

	test('rejects queue mode', () => {
		const env = { ...postgresEnv };

		expect(() => applyEngineEnv(env, { engine: 'in-process', isQueueMode: true })).toThrow(
			/queue mode/,
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
