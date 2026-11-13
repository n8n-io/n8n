import { join } from 'node:path';
import { ENGINE_DATABASE, ENGINE_MODULE } from 'n8n-containers/services/engine';

import type { Topology } from '../config/env-yaml';
import type { EnvPaths } from '../config/paths';
import {
	ENGINE_CONTROL_PLANE_PORT,
	ENGINE_HTTP_PORT,
	type LauncherComponent,
	type ProcessComponent,
	type RunnerLayer,
} from '../topology/components';

export const POSTGRES_USER = 'postgres';
export const POSTGRES_PASSWORD = 'postgres';
export const POSTGRES_DATABASE = 'n8n';
export { ENGINE_DATABASE, ENGINE_MODULE };

/** Keys that only the control plane may hold. Same rule as `engineContainerEnv` in n8n-containers. */
export function isControlPlaneOnlyKey(key: string): boolean {
	return key === 'N8N_ENCRYPTION_KEY' || key === 'N8N_ENCRYPTION_KEY_FILE' || key.startsWith('DB_');
}

/** Keys that a main in engine remote mode must not hold: the data plane owns them. */
export function isDataPlaneOnlyKey(key: string): boolean {
	return key === 'N8N_ENGINE_DATABASE_URL' || key === 'N8N_ENGINE_RESUME_SECRET';
}

/** Keys that change the topology. Set them in env.yaml, not in a layer file. */
export const TOPOLOGY_KEYS: Record<string, string> = {
	DB_TYPE: 'db',
	EXECUTIONS_MODE: 'queue',
	N8N_MULTI_MAIN_SETUP_ENABLED: 'mains',
	N8N_RUNNERS_MODE: 'runners.mode',
	N8N_ENGINE_MODE: 'engine',
};

export interface ManagedContext {
	topology: Topology;
	paths: EnvPaths;
	repoRoot?: string;
	/** The public URL of the tunnel, when it runs. */
	tunnelUrl?: string;
}

/**
 * Wiring for a public URL. n8n builds webhook URLs and, while
 * `N8N_EDITOR_BASE_URL` is unset, OAuth callback URLs from `N8N_WEBHOOK_URL`.
 * The editor stays on localhost. The tunnel is one proxy in front of the mains.
 */
function tunnelEnv(
	tunnelUrl: string | undefined,
	role: ProcessComponent['role'],
): Record<string, string> {
	if (!tunnelUrl) return {};
	const env: Record<string, string> = { N8N_WEBHOOK_URL: `${tunnelUrl}/` };
	if (role === 'main') env.N8N_PROXY_HOPS = '1';
	return env;
}

function redisEnv(topology: Topology): Record<string, string> {
	return {
		QUEUE_BULL_REDIS_HOST: '127.0.0.1',
		QUEUE_BULL_REDIS_PORT: String(topology.services.redis.port),
	};
}

function engineDatabaseUrl(topology: Topology): string {
	const { port } = topology.services.postgres;
	return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${port}/${ENGINE_DATABASE}`;
}

function sharedStorageEnv(paths: EnvPaths): Record<string, string> {
	return {
		N8N_STORAGE_PATH: paths.storage,
		N8N_DEFAULT_BINARY_DATA_MODE: 'filesystem',
	};
}

/** Developer defaults. Layer files override them without a warning. */
export function defaultProcessEnv(): Record<string, string> {
	return {
		N8N_DIAGNOSTICS_ENABLED: 'false',
		N8N_LOG_LEVEL: 'info',
	};
}

/** Values that wire the topology together. `rig env set` warns before it overrides them. */
export function managedProcessEnv(
	{ topology, paths, tunnelUrl }: ManagedContext,
	component: ProcessComponent,
): Record<string, string> {
	const env: Record<string, string> = {
		N8N_USER_FOLDER: paths.userFolder(component.name),
		N8N_RUNNERS_BROKER_PORT: String(component.ports.broker),
		N8N_RUNNERS_MODE: topology.runners.mode,
		...tunnelEnv(tunnelUrl, component.role),
	};
	if (topology.runners.mode === 'external') {
		env.N8N_RUNNERS_BROKER_LISTEN_ADDRESS = '127.0.0.1';
	}

	if (component.role === 'engine') {
		return {
			...env,
			N8N_ENABLED_MODULES: ENGINE_MODULE,
			N8N_ENGINE_PORT: String(ENGINE_HTTP_PORT),
			N8N_ENGINE_HOST: '127.0.0.1',
			N8N_ENGINE_DATABASE_URL: engineDatabaseUrl(topology),
			N8N_ENGINE_CONTROL_PLANE_BASE_URL: `http://127.0.0.1:${ENGINE_CONTROL_PLANE_PORT}`,
			N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP: 'true',
			...sharedStorageEnv(paths),
			...redisEnv(topology),
		};
	}

	if (topology.db === 'sqlite') {
		env.DB_TYPE = 'sqlite';
	} else {
		Object.assign(env, {
			DB_TYPE: 'postgresdb',
			DB_POSTGRESDB_HOST: '127.0.0.1',
			DB_POSTGRESDB_PORT: String(topology.services.postgres.port),
			DB_POSTGRESDB_USER: POSTGRES_USER,
			DB_POSTGRESDB_PASSWORD: POSTGRES_PASSWORD,
			DB_POSTGRESDB_DATABASE: POSTGRES_DATABASE,
		});
	}

	if (topology.queue) {
		Object.assign(env, { EXECUTIONS_MODE: 'queue' }, redisEnv(topology));
	} else {
		env.EXECUTIONS_MODE = 'regular';
	}

	if (topology.mains > 1) env.N8N_MULTI_MAIN_SETUP_ENABLED = 'true';

	if (component.role === 'worker') {
		env.QUEUE_HEALTH_CHECK_ACTIVE = 'true';
		env.QUEUE_HEALTH_CHECK_PORT = String(component.ports.http);
		return env;
	}

	env.N8N_PORT = String(component.ports.http);

	if (topology.engine === 'in-process') {
		Object.assign(env, {
			N8N_ENABLED_MODULES: ENGINE_MODULE,
			N8N_ENGINE_MODE: 'in-process',
			N8N_ENGINE_DATABASE_URL: engineDatabaseUrl(topology),
			N8N_ENGINE_DEFAULT_TYPE: 'v2',
		});
	} else if (topology.engine === 'remote') {
		Object.assign(
			env,
			{
				N8N_ENABLED_MODULES: ENGINE_MODULE,
				N8N_ENGINE_MODE: 'remote',
				N8N_ENGINE_DEFAULT_TYPE: 'v2',
				N8N_ENGINE_BASE_URL: `http://127.0.0.1:${ENGINE_HTTP_PORT}`,
				N8N_ENGINE_CONTROL_PLANE_PORT: String(ENGINE_CONTROL_PLANE_PORT),
				N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP: 'true',
			},
			sharedStorageEnv(paths),
			redisEnv(topology),
		);
	}

	return env;
}

export function managedLauncherEnv(
	{ paths }: ManagedContext,
	component: LauncherComponent,
): Record<string, string> {
	const { ports } = component.host;
	return {
		N8N_RUNNERS_TASK_BROKER_URI: `http://127.0.0.1:${ports.broker}`,
		N8N_RUNNERS_LAUNCHER_HEALTH_CHECK_PORT: String(ports.launcherHealth),
		N8N_RUNNERS_CONFIG_PATH: paths.launcherConfig(component.host.name),
	};
}

export function defaultLauncherEnv(): Record<string, string> {
	return {
		// Runners stay up, so the first task does not wait for a cold start.
		N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT: '0',
		N8N_RUNNERS_LAUNCHER_LOG_LEVEL: 'info',
		// Short drain periods, so a restart takes seconds. The launcher passes them to the runners.
		N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT: '2',
		N8N_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN: '1',
	};
}

/** Same defaults as `docker/images/runners/n8n-task-runners.json`. */
export function defaultRunnerEnv(layer: RunnerLayer): Record<string, string> {
	if (layer === 'runner-js') {
		return {
			NODE_FUNCTION_ALLOW_BUILTIN: 'crypto',
			NODE_FUNCTION_ALLOW_EXTERNAL: 'moment',
		};
	}
	return {
		N8N_RUNNERS_STDLIB_ALLOW: '',
		N8N_RUNNERS_EXTERNAL_ALLOW: '',
	};
}

export function managedRunnerEnv(
	{ repoRoot }: ManagedContext,
	layer: RunnerLayer,
): Record<string, string> {
	if (layer === 'runner-py' && repoRoot) {
		return { PYTHONPATH: join(repoRoot, 'packages/@n8n/task-runner-python') };
	}
	return {};
}
