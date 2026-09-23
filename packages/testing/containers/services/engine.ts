/**
 * How the stack runs engine 2.0.
 *
 * `in-process` enables the `engine-v2` backend module, so the data plane runs
 * inside the main container. `container` starts a separate `n8n engine`
 * container as the data plane and runs the main in remote mode. The engine
 * container has no control plane database access.
 */
export type EngineMode = 'in-process' | 'container';

export const ENGINE_MODULE = 'engine-v2';

/** The data plane keeps its own database on the stack Postgres. */
export const ENGINE_DATABASE = 'n8n_engine';

/** Port the engine container serves on. The main dials it; the stack probes it. */
export const ENGINE_PORT = 3000;

/** Port the main's control plane server listens on. The engine dials it. */
export const ENGINE_CONTROL_PLANE_PORT = 3001;

/** Every value the URL interpolates, so a missing one is named, not printed. */
const CONNECTION_KEYS = [
	'DB_POSTGRESDB_USER',
	'DB_POSTGRESDB_PASSWORD',
	'DB_POSTGRESDB_HOST',
	'DB_POSTGRESDB_PORT',
] as const;

/** Env the engine container must never receive: control plane database access and its key. */
const CONTROL_PLANE_ONLY_KEYS = ['N8N_ENCRYPTION_KEY'];
const CONTROL_PLANE_ONLY_PREFIXES = ['DB_'];

interface EngineEnvOptions {
	engine: EngineMode | undefined;
	authSecret?: string;
	mains: number;
	isQueueMode: boolean;
	/** Names the network aliases of the main and the engine. */
	projectName: string;
}

export function engineHostname(projectName: string): string {
	return `${projectName}-n8n-engine`;
}

/** The single main's network alias. `assertEngineSupported` guarantees there is one. */
function mainHostname(projectName: string): string {
	return `${projectName}-n8n`;
}

/**
 * Refuses a stack that engine 2.0 cannot run on. `createN8NStack` calls this
 * before it starts a container, so the run fails in a second instead of after
 * a Postgres boot. No-op when `engine` is unset.
 */
export function assertEngineSupported({
	engine,
	mains,
	isQueueMode,
	usePostgres,
}: Omit<EngineEnvOptions, 'projectName'> & { usePostgres: boolean }): void {
	if (!engine) return;

	if (isQueueMode) {
		throw new Error('Engine 2.0 does not support queue mode: use a single main and no workers');
	}

	// The engine reports to a main; without one it would be started as "main 1".
	if (mains !== 1) {
		throw new Error(`Engine 2.0 needs exactly one main: got mains: ${mains}`);
	}

	if (!usePostgres) {
		throw new Error('Engine 2.0 needs Postgres: set `postgres: true` on the stack config');
	}
}

/**
 * The data plane database URL: an explicit one from a service, else the
 * `n8n_engine` database on the Postgres the `DB_POSTGRESDB_*` values name.
 */
function resolveEngineDatabaseUrl(env: Record<string, string>): string {
	if (env.N8N_ENGINE_DATABASE_URL) return env.N8N_ENGINE_DATABASE_URL;

	// `env` types every value as present, so a missing one would otherwise reach
	// the URL as the literal `undefined` and fail at engine boot.
	const missing = CONNECTION_KEYS.filter((key) => !env[key]);
	if (missing.length > 0) {
		throw new Error(`Engine 2.0 needs the Postgres connection env: missing ${missing.join(', ')}`);
	}

	const user = encodeURIComponent(env.DB_POSTGRESDB_USER);
	const password = encodeURIComponent(env.DB_POSTGRESDB_PASSWORD);
	return `postgres://${user}:${password}@${env.DB_POSTGRESDB_HOST}:${env.DB_POSTGRESDB_PORT}/${ENGINE_DATABASE}`;
}

/**
 * Adds the env that turns on engine 2.0 to the main's environment in place.
 *
 * Reads the `DB_POSTGRESDB_*` values the Postgres service already contributed,
 * so the caller never handles credentials. No-op when `engine` is unset.
 */
export function applyEngineEnv(
	env: Record<string, string>,
	{ engine, authSecret, mains, isQueueMode, projectName }: EngineEnvOptions,
): void {
	if (!engine) return;

	assertEngineSupported({ engine, mains, isQueueMode, usePostgres: env.DB_TYPE === 'postgresdb' });

	const modules = (env.N8N_ENABLED_MODULES ?? '').split(',').filter(Boolean);
	if (!modules.includes(ENGINE_MODULE)) modules.push(ENGINE_MODULE);
	env.N8N_ENABLED_MODULES = modules.join(',');

	if (engine === 'container') {
		if (!authSecret) throw new Error('Container engine mode needs a shared auth secret');
		env.N8N_ENGINE_MODE = 'remote';
		env.N8N_ENGINE_BASE_URL = `http://${engineHostname(projectName)}:${ENGINE_PORT}`;
		// Loopback by default; the engine container dials it over the stack network.
		// The stack owns the port too: the engine env dials it and a caller's
		// `env` must not move it.
		env.N8N_ENGINE_CONTROL_PLANE_HOST = '0.0.0.0';
		env.N8N_ENGINE_CONTROL_PLANE_PORT = String(ENGINE_CONTROL_PLANE_PORT);
		env.N8N_ENGINE_AUTH_SECRET = authSecret;
		// The main never touches the data plane database in this mode.
		delete env.N8N_ENGINE_DATABASE_URL;
		return;
	}

	env.N8N_ENGINE_DATABASE_URL = resolveEngineDatabaseUrl(env);
}

/**
 * The environment of the engine container: the shared env without control
 * plane database access, plus what the data plane needs to run alone.
 *
 * Takes the shared env *before* `applyEngineEnv` removes the engine URL from
 * the main. A dedicated database service supplies that URL.
 */
export function engineContainerEnv(
	sharedEnv: Record<string, string>,
	{ projectName, authSecret }: Pick<EngineEnvOptions, 'projectName'> & { authSecret: string },
): Record<string, string> {
	if (!authSecret) throw new Error('Container engine mode needs a shared auth secret');
	const databaseUrl = sharedEnv.N8N_ENGINE_DATABASE_URL;
	if (!databaseUrl) throw new Error('Container engine mode needs N8N_ENGINE_DATABASE_URL');

	const env = Object.fromEntries(
		Object.entries(sharedEnv).filter(
			([key]) =>
				!CONTROL_PLANE_ONLY_KEYS.includes(key) &&
				!CONTROL_PLANE_ONLY_PREFIXES.some((prefix) => key.startsWith(prefix)),
		),
	);

	return {
		...env,
		N8N_ENGINE_DATABASE_URL: databaseUrl,
		N8N_ENGINE_AUTH_SECRET: authSecret,
		N8N_ENGINE_CONTROL_PLANE_BASE_URL: `http://${mainHostname(projectName)}:${ENGINE_CONTROL_PLANE_PORT}`,
		// The main dials this port and the stack probes it, so a caller's `env`
		// must not move it.
		N8N_ENGINE_PORT: String(ENGINE_PORT),
	};
}
