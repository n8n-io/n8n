/**
 * How the stack runs engine v2.
 *
 * `in-process` enables the `engine-v2` backend module, so the data plane runs
 * inside the main container. A separate data plane container is not supported
 * yet: the standalone engine image has no v1 step executor.
 */
export type EngineMode = 'in-process';

export const ENGINE_MODULE = 'engine-v2';

/** The data plane keeps its own database on the stack Postgres. */
export const ENGINE_DATABASE = 'n8n_engine';

/** Every value the URL interpolates, so a missing one is named, not printed. */
const CONNECTION_KEYS = [
	'DB_POSTGRESDB_USER',
	'DB_POSTGRESDB_PASSWORD',
	'DB_POSTGRESDB_HOST',
	'DB_POSTGRESDB_PORT',
] as const;

interface EngineEnvOptions {
	engine: EngineMode | undefined;
	isQueueMode: boolean;
}

/**
 * Refuses a stack that engine v2 cannot run on. `createN8NStack` calls this
 * before it starts a container, so the run fails in a second instead of after
 * a Postgres boot. No-op when `engine` is unset.
 */
export function assertEngineSupported({
	engine,
	isQueueMode,
	usePostgres,
}: EngineEnvOptions & { usePostgres: boolean }): void {
	if (!engine) return;

	if (isQueueMode) {
		throw new Error('Engine v2 does not support queue mode: use a single main and no workers');
	}

	if (!usePostgres) {
		throw new Error('Engine v2 needs Postgres: set `postgres: true` on the stack config');
	}
}

/**
 * Adds the env that turns on engine v2 to an n8n environment in place.
 *
 * Reads the `DB_POSTGRESDB_*` values the Postgres service already contributed,
 * so the caller never handles credentials. No-op when `engine` is unset.
 */
export function applyEngineEnv(
	env: Record<string, string>,
	{ engine, isQueueMode }: EngineEnvOptions,
): void {
	if (!engine) return;

	assertEngineSupported({ engine, isQueueMode, usePostgres: env.DB_TYPE === 'postgresdb' });

	// `env` types every value as present, so a missing one would otherwise reach
	// the URL as the literal `undefined` and fail at engine boot.
	const missing = CONNECTION_KEYS.filter((key) => !env[key]);
	if (missing.length > 0) {
		throw new Error(`Engine v2 needs the Postgres connection env: missing ${missing.join(', ')}`);
	}

	const modules = (env.N8N_ENABLED_MODULES ?? '').split(',').filter(Boolean);
	if (!modules.includes(ENGINE_MODULE)) modules.push(ENGINE_MODULE);
	env.N8N_ENABLED_MODULES = modules.join(',');
	if (env.N8N_ENGINE_DATABASE_URL) return;

	const user = encodeURIComponent(env.DB_POSTGRESDB_USER);
	const password = encodeURIComponent(env.DB_POSTGRESDB_PASSWORD);
	env.N8N_ENGINE_DATABASE_URL = `postgres://${user}:${password}@${env.DB_POSTGRESDB_HOST}:${env.DB_POSTGRESDB_PORT}/${ENGINE_DATABASE}`;
}
