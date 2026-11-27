/**
 * How the stack runs engine v2.
 *
 * `in-process` enables the `engine-v2` backend module, so the data plane runs
 * inside the main container. `container` starts a separate `n8n engine`
 * container as the data plane and runs the main in remote mode, or one
 * container per engine role with `splitEngineRoles`. The engine containers
 * have no control plane database access.
 *
 * Two functions build the env, one per plane:
 * - `applyEngineEnv`: the main (control plane), in both modes.
 * - `engineContainerEnv`: the `n8n engine` container (data plane), in
 *   `container` mode only.
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { generateTlsCerts } from '../helpers/tls-certs';
import type { FileToMount } from './types';

export type EngineMode = 'in-process' | 'container';

export const ENGINE_MODULE = 'engine-v2';

/** The data plane keeps its own database on the stack Postgres. */
export const ENGINE_DATABASE = 'n8n_engine';

/** Port the engine container serves on. The main dials it; the stack probes it. */
export const ENGINE_PORT = 3000;

/** Port the main's control plane server listens on. The engine dials it. */
export const ENGINE_CONTROL_PLANE_PORT = 3001;

/**
 * Mount target for the shared storage directory in n8n and engine containers.
 * The stack owns this path: a caller's `N8N_STORAGE_PATH` or deprecated
 * `N8N_BINARY_DATA_STORAGE_PATH` would point the containers at different
 * directories, or stop n8n from starting when the two differ.
 */
export const ENGINE_SHARED_STORAGE_PATH = '/data/storage';

/** Where each plane finds its own TLS certificate and key and the shared CA. */
const ENGINE_TLS_DIR = '/home/node/engine-tls';

export const ENGINE_TLS_ENV = {
	N8N_ENGINE_TLS_CERT_FILE: `${ENGINE_TLS_DIR}/tls.crt`,
	N8N_ENGINE_TLS_KEY_FILE: `${ENGINE_TLS_DIR}/tls.key`,
	N8N_ENGINE_TLS_CA_FILE: `${ENGINE_TLS_DIR}/ca.crt`,
};

/**
 * One CA and one certificate per plane for `container` mode, as files to copy
 * into the main and the engine at the paths `ENGINE_TLS_ENV` names. Each
 * certificate names the host the other plane dials. The stack creates these
 * once, so a replaced main still trusts the running engine.
 */
export function createEngineTlsFiles(
	projectName: string,
	mains: number,
): Record<'main' | 'engine', FileToMount[]> {
	const dir = mkdtempSync(join(tmpdir(), `${projectName}-engine-tls-`));
	try {
		const { caFile, leaves } = generateTlsCerts(dir, {
			// Every main gets the same certificate, so it names all of them.
			main: mainHostnames(projectName, mains).map((host) => `DNS:${host}`),
			engine: [`DNS:${engineHostname(projectName)}`],
		});
		const filesOf = (plane: 'main' | 'engine'): FileToMount[] => [
			{ content: readFileSync(caFile, 'utf8'), target: ENGINE_TLS_ENV.N8N_ENGINE_TLS_CA_FILE },
			{
				content: readFileSync(leaves[plane].certFile, 'utf8'),
				target: ENGINE_TLS_ENV.N8N_ENGINE_TLS_CERT_FILE,
			},
			{
				content: readFileSync(leaves[plane].keyFile, 'utf8'),
				target: ENGINE_TLS_ENV.N8N_ENGINE_TLS_KEY_FILE,
			},
		];
		return { main: filesOf('main'), engine: filesOf('engine') };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * MockServer (the `proxy` capability) intercepts TLS and drops the client
 * certificate, so traffic between the planes must not go through it.
 */
function bypassProxyBetweenPlanes(
	env: Record<string, string>,
	projectName: string,
	mains: number,
): void {
	const hosts = (env.NO_PROXY ?? '').split(',').filter(Boolean);
	for (const host of [engineHostname(projectName), ...mainHostnames(projectName, mains)]) {
		if (!hosts.includes(host)) hosts.push(host);
	}
	env.NO_PROXY = hosts.join(',');
}

export function applySharedStorageEnv(
	env: Record<string, string>,
	binaryDataMode = 'filesystem',
): void {
	env.N8N_STORAGE_PATH = ENGINE_SHARED_STORAGE_PATH;
	env.N8N_DEFAULT_BINARY_DATA_MODE = binaryDataMode;
	// n8n fails to start if the deprecated path differs from the storage path.
	delete env.N8N_BINARY_DATA_STORAGE_PATH;
	delete env.N8N_BINARY_DATA_STORAGE_PATH_FILE;
}

/** Every value the URL interpolates, so a missing one is named, not printed. */
const CONNECTION_KEYS = [
	'DB_POSTGRESDB_USER',
	'DB_POSTGRESDB_PASSWORD',
	'DB_POSTGRESDB_HOST',
	'DB_POSTGRESDB_PORT',
] as const;

/** Env the engine container must never receive: control plane database access and its key. */
const CONTROL_PLANE_ONLY_KEYS = ['N8N_ENCRYPTION_KEY', 'N8N_ENCRYPTION_KEY_FILE'];
const CONTROL_PLANE_ONLY_PREFIXES = ['DB_'];

/**
 * The secret the data plane signs and checks resume tokens with. Only the data
 * plane gets it. Derived from the project name, so a rerun with the same name
 * reuses the containers instead of changing their env.
 */
function resumeSecret(projectName: string): string {
	return createHash('sha256').update(`${projectName}:engine-resume`).digest('hex');
}

interface EngineEnvOptions {
	engine: EngineMode | undefined;
	authSecret?: string;
	mains: number;
	workers: number;
	webhooks: number;
	/** Names the network aliases of the main and the engine. */
	projectName: string;
}

type EngineTopology = Pick<EngineEnvOptions, 'engine' | 'mains' | 'workers' | 'webhooks'>;

export function engineHostname(projectName: string): string {
	return `${projectName}-n8n-engine`;
}

// Copy of `ENGINE_ROLES` in `@n8n/engine/src/runtime/create-engine-runtime.ts`,
// which this package does not depend on: add a new role here too.
const ENGINE_ROLES = ['api', 'orchestrator', 'step-worker'] as const;
type EngineRole = (typeof ENGINE_ROLES)[number];

/** The `api` role keeps the engine hostname: the main dials it and the engine certificate names it. */
function engineRoleHostname(projectName: string, role: EngineRole): string {
	if (role === 'api') return engineHostname(projectName);
	return `${engineHostname(projectName)}-${role}`;
}

/** The `n8n engine` containers of `container` mode: one with every role, or one per role. */
export function engineContainers(
	projectName: string,
	splitRoles: boolean,
): Array<{ name: string; command: string[] }> {
	if (!splitRoles) return [{ name: engineHostname(projectName), command: ['engine'] }];
	return ENGINE_ROLES.map((role) => ({
		name: engineRoleHostname(projectName, role),
		command: ['engine', `--roles=${role}`],
	}));
}

/** Only the `step-worker` role starts the task broker. */
export function engineTaskBrokerHostname(projectName: string, splitRoles: boolean): string {
	if (splitRoles) return engineRoleHostname(projectName, 'step-worker');
	return engineHostname(projectName);
}

/**
 * The network aliases of the mains, main 1 first. The engine dials the control
 * plane server of main 1: every main runs one on the shared database, so one is
 * enough.
 */
function mainHostnames(projectName: string, mains: number): string[] {
	if (mains <= 1) return [`${projectName}-n8n`];
	return Array.from({ length: mains }, (_, i) => `${projectName}-n8n-main-${i + 1}`);
}

/**
 * Refuses a stack that engine v2 cannot run on. `createN8NStack` calls this
 * before it starts a container, so the run fails in a second instead of after
 * a Postgres boot. No-op when `engine` and `splitEngineRoles` are unset.
 */
export function assertEngineSupported({
	engine,
	splitEngineRoles,
	mains,
	workers,
	webhooks,
	usePostgres,
}: EngineTopology & { splitEngineRoles?: boolean; usePostgres: boolean }): void {
	if (splitEngineRoles && engine !== 'container') {
		throw new Error(`splitEngineRoles needs \`engine: 'container'\`: got engine: ${engine}`);
	}

	if (!engine) return;

	// The `engine-v2` module runs on mains only, so a webhook process would not
	// route a webhook to engine v2. A worker only runs the legacy engine.
	if (webhooks > 0) {
		throw new Error(`Engine v2 does not support webhook processes: got webhooks: ${webhooks}`);
	}

	// The engine reports to a main; without one it would be started as "main 1".
	if (mains < 1) {
		throw new Error(`Engine v2 needs at least one main: got mains: ${mains}`);
	}

	// More than one main or a worker runs queue mode, which the in-process engine
	// cannot share.
	if (engine === 'in-process' && (mains > 1 || workers > 0)) {
		throw new Error(
			`Engine v2 in-process mode needs exactly one main and no workers: got mains: ${mains}, workers: ${workers}. Use container mode.`,
		);
	}

	if (!usePostgres) {
		throw new Error('Engine v2 needs Postgres: set `postgres: true` on the stack config');
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
		throw new Error(`Engine v2 needs the Postgres connection env: missing ${missing.join(', ')}`);
	}

	const user = encodeURIComponent(env.DB_POSTGRESDB_USER);
	const password = encodeURIComponent(env.DB_POSTGRESDB_PASSWORD);
	return `postgres://${user}:${password}@${env.DB_POSTGRESDB_HOST}:${env.DB_POSTGRESDB_PORT}/${ENGINE_DATABASE}`;
}

/**
 * Adds the env that turns on engine v2 to the main's environment in place.
 * Control plane only: in `in-process` mode the main also hosts the data plane
 * and gets its database URL; in `container` mode the main gets remote mode and
 * the address of the engine container, which `engineContainerEnv` configures.
 *
 * Reads the `DB_POSTGRESDB_*` values the Postgres service already contributed,
 * so the caller never handles credentials. No-op when `engine` is unset.
 */
export function applyEngineEnv(
	env: Record<string, string>,
	{ engine, authSecret, mains, workers, webhooks, projectName }: EngineEnvOptions,
): void {
	if (!engine) return;

	assertEngineSupported({
		engine,
		mains,
		workers,
		webhooks,
		usePostgres: env.DB_TYPE === 'postgresdb',
	});

	const modules = (env.N8N_ENABLED_MODULES ?? '').split(',').filter(Boolean);
	if (!modules.includes(ENGINE_MODULE)) modules.push(ENGINE_MODULE);
	env.N8N_ENABLED_MODULES = modules.join(',');

	if (engine === 'container') {
		if (!authSecret) throw new Error('Container engine mode needs a shared auth secret');
		env.N8N_ENGINE_MODE = 'remote';
		env.N8N_ENGINE_BASE_URL = `https://${engineHostname(projectName)}:${ENGINE_PORT}`;
		Object.assign(env, ENGINE_TLS_ENV);
		// Loopback by default; the engine container dials it over the stack network.
		// The stack owns the port too: the engine env dials it and a caller's
		// `env` must not move it.
		env.N8N_ENGINE_CONTROL_PLANE_HOST = '0.0.0.0';
		env.N8N_ENGINE_CONTROL_PLANE_PORT = String(ENGINE_CONTROL_PLANE_PORT);
		env.N8N_ENGINE_AUTH_SECRET = authSecret;
		// The engine cannot access the control plane database.
		applySharedStorageEnv(env);
		bypassProxyBetweenPlanes(env, projectName, mains);
		// The main never touches the data plane database in this mode, and it
		// refuses to start with the resume secret.
		delete env.N8N_ENGINE_DATABASE_URL;
		delete env.N8N_ENGINE_RESUME_SECRET;
		return;
	}

	env.N8N_ENGINE_DATABASE_URL = resolveEngineDatabaseUrl(env);
	env.N8N_ENGINE_RESUME_SECRET = resumeSecret(projectName);
}

/**
 * The environment of the engine container (data plane, `container` mode only):
 * the shared env without control plane database access, plus what the data
 * plane needs to run alone.
 *
 * Takes the shared env *before* `applyEngineEnv` removes the engine URL from
 * the main. A dedicated database service supplies that URL.
 */
export function engineContainerEnv(
	sharedEnv: Record<string, string>,
	{
		projectName,
		mains,
		authSecret,
	}: Pick<EngineEnvOptions, 'projectName' | 'mains'> & { authSecret: string },
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

	applySharedStorageEnv(env);
	bypassProxyBetweenPlanes(env, projectName, mains);

	return {
		...env,
		N8N_ENGINE_DATABASE_URL: databaseUrl,
		N8N_ENGINE_AUTH_SECRET: authSecret,
		N8N_ENGINE_RESUME_SECRET: resumeSecret(projectName),
		...ENGINE_TLS_ENV,
		N8N_ENGINE_CONTROL_PLANE_BASE_URL: `https://${mainHostnames(projectName, mains)[0]}:${ENGINE_CONTROL_PLANE_PORT}`,
		// The main dials this address and the stack probes it, so a caller's `env`
		// must not move it or bind it to loopback.
		N8N_ENGINE_HOST: '0.0.0.0',
		N8N_ENGINE_PORT: String(ENGINE_PORT),
	};
}
