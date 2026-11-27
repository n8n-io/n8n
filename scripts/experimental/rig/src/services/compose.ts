import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { sleep } from '@n8n/utils/sleep';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import { stringify } from 'yaml';
import { z } from 'zod';

import {
	MAILPIT_SMTP_PORT,
	MAILPIT_UI_PORT,
	mailpitUiPort,
	requiredServices,
	type ServiceName,
	servicePort,
	type Topology,
} from '../config/env-yaml';
import type { EnvPaths } from '../config/paths';
import {
	ENGINE_DATABASE,
	POSTGRES_DATABASE,
	POSTGRES_PASSWORD,
	POSTGRES_USER,
} from '../env/managed';
import { RigError } from '../errors';
import { processComponents } from '../topology/components';
import {
	assertRuntimeRunning,
	type ContainerRuntime,
	containerRuntime,
	ensureContainerRuntime,
	serverVersion,
} from './runtime';
import {
	clearTunnelUrl,
	readTunnelUrl,
	TUNNEL_TOKEN_KEY,
	tunnelToken,
	waitForTunnel,
} from './tunnel';

export type { ServiceName };

export function projectName(envName: string): string {
	return `rig-${envName}`;
}

function image(configured: string, fallback: string): string {
	return configured === 'auto' ? fallback : configured;
}

/** Postgres 18 images keep data in a versioned directory under /var/lib/postgresql. */
export function postgresDataMount(postgresImage: string): string {
	const major = Number(/:(\d+)/.exec(postgresImage)?.[1]);
	return Number.isFinite(major) && major < 18 ? '/var/lib/postgresql/data' : '/var/lib/postgresql';
}

export function buildCompose(envName: string, topology: Topology): Record<string, unknown> {
	const services: Record<string, unknown> = {};
	const volumes: Record<string, unknown> = {};
	const labels = { 'n8n-rig': envName };
	const needed = requiredServices(topology);

	if (needed.includes('postgres')) {
		const postgresImage = image(topology.services.postgres.image, TEST_CONTAINER_IMAGES.postgres);
		services.postgres = {
			image: postgresImage,
			container_name: containerName(envName, 'postgres'),
			labels,
			environment: {
				POSTGRES_USER,
				POSTGRES_PASSWORD,
				POSTGRES_DB: POSTGRES_DATABASE,
			},
			ports: [`127.0.0.1:${servicePort(topology, 'postgres')}:5432`],
			volumes: [
				`pgdata:${postgresDataMount(postgresImage)}`,
				'./postgres-init.sql:/docker-entrypoint-initdb.d/rig-init.sql:ro',
			],
			healthcheck: {
				test: ['CMD-SHELL', `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DATABASE}`],
				interval: '1s',
				timeout: '3s',
				retries: 60,
			},
		};
		volumes.pgdata = { name: `${projectName(envName)}-pgdata`, labels };
	}

	if (needed.includes('redis')) {
		services.redis = {
			image: image(topology.services.redis.image, TEST_CONTAINER_IMAGES.redis),
			container_name: containerName(envName, 'redis'),
			labels,
			ports: [`127.0.0.1:${servicePort(topology, 'redis')}:6379`],
			healthcheck: {
				test: ['CMD', 'redis-cli', 'ping'],
				interval: '1s',
				timeout: '3s',
				retries: 60,
			},
		};
	}

	if (needed.includes('tunnel')) {
		const { tunnel } = topology;
		const target = processComponents(topology).find((c) => c.name === tunnel.target);
		const metricsPort = servicePort(topology, 'tunnel');
		const metrics = ['--metrics', `0.0.0.0:${metricsPort}`];
		services.tunnel = {
			image: image(tunnel.image, TEST_CONTAINER_IMAGES.cloudflared),
			container_name: containerName(envName, 'tunnel'),
			labels,
			// A named tunnel takes its routes from the Cloudflare dashboard. A quick tunnel gets one here.
			command: tunnel.hostname
				? ['tunnel', '--no-autoupdate', ...metrics, 'run']
				: [
						'tunnel',
						'--no-autoupdate',
						...metrics,
						'--url',
						`http://host.docker.internal:${target?.ports.http ?? 5678}`,
					],
			// rig passes the token in the environment of `compose`, so it stays out of this file.
			// The container env keeps it out of `ps`, but anyone with container runtime access
			// reads it with `docker inspect`. On Docker that access is root-equivalent already.
			...(tunnel.hostname ? { environment: [`TUNNEL_TOKEN=\${${TUNNEL_TOKEN_KEY}}`] } : {}),
			ports: [`127.0.0.1:${metricsPort}:${metricsPort}`],
			// Docker Desktop, OrbStack, and Podman define this host. Docker on Linux needs the mapping.
			extra_hosts: ['host.docker.internal:host-gateway'],
		};
	}

	if (needed.includes('mailpit')) {
		services.mailpit = {
			image: image(topology.mail.image, TEST_CONTAINER_IMAGES.mailpit),
			container_name: containerName(envName, 'mailpit'),
			labels,
			environment: {
				// The emails stay after a stop, like the Postgres data.
				MP_DATABASE: '/data/mailpit.db',
				// The Send Email node can use any SMTP credentials.
				MP_SMTP_AUTH_ACCEPT_ANY: 'true',
				MP_SMTP_AUTH_ALLOW_INSECURE: 'true',
			},
			ports: [
				`127.0.0.1:${servicePort(topology, 'mailpit')}:${MAILPIT_SMTP_PORT}`,
				`127.0.0.1:${mailpitUiPort(topology)}:${MAILPIT_UI_PORT}`,
			],
			volumes: ['mailpit:/data'],
			healthcheck: {
				test: ['CMD', '/mailpit', 'readyz'],
				interval: '1s',
				timeout: '3s',
				retries: 60,
			},
		};
		volumes.mailpit = { name: `${projectName(envName)}-mailpit`, labels };
	}

	const compose: Record<string, unknown> = { name: projectName(envName), services };
	if (Object.keys(volumes).length > 0) compose.volumes = volumes;
	return compose;
}

export function writeCompose(envName: string, topology: Topology, paths: EnvPaths): void {
	writeFileSync(
		paths.compose,
		`# Generated by rig. Do not edit: rig writes this file again before each start.\n${stringify(buildCompose(envName, topology))}`,
	);
	writeFileSync(paths.postgresInit, `CREATE DATABASE ${ENGINE_DATABASE};\n`);
}

function composeArgs(envName: string, paths: EnvPaths, args: string[]): string[] {
	return ['compose', '-p', projectName(envName), '-f', paths.compose, ...args];
}

export function containerName(envName: string, service: ServiceName): string {
	return `${projectName(envName)}-${service}`;
}

async function run(
	runtime: ContainerRuntime,
	args: string[],
	options: { env?: Record<string, string> } = {},
): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(runtime, args, {
			stdio: 'pipe',
			env: { ...process.env, ...options.env },
		});
		let output = '';
		child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
		child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) resolve();
			else {
				reject(
					new RigError(
						`${runtime} ${args.join(' ')} failed with exit code ${code}.\n${output.trim()}`,
					),
				);
			}
		});
	});
}

const inspectSchema = z.array(
	z.object({
		State: z.object({
			Status: z.string(),
			// Docker names it Health. Older Podman versions name it Healthcheck.
			Health: z.object({ Status: z.string() }).nullish(),
			Healthcheck: z.object({ Status: z.string() }).nullish(),
		}),
	}),
);

export interface ServiceStatus {
	name: ServiceName;
	state: string;
	health: string;
}

/**
 * The state of one service container, from `inspect`. Docker and Podman print
 * the same fields, while `compose ps` differs between compose providers.
 */
function inspectService(
	runtime: ContainerRuntime,
	envName: string,
	service: ServiceName,
): ServiceStatus | undefined {
	const result = spawnSync(
		runtime,
		['inspect', '--type', 'container', containerName(envName, service)],
		{
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		},
	);
	if (result.status !== 0) return undefined;
	try {
		const parsed = inspectSchema.safeParse(JSON.parse(result.stdout));
		const state = parsed.success ? parsed.data[0]?.State : undefined;
		if (!state) return undefined;
		const health = state.Health?.Status ?? state.Healthcheck?.Status ?? '';
		return { name: service, state: state.Status, health };
	} catch {
		return undefined;
	}
}

const SERVICES_TIMEOUT_MS = 120_000;

/** Waits until every container runs and passes its health check, if it has one. */
async function waitForServices(
	runtime: ContainerRuntime,
	envName: string,
	services: ServiceName[],
): Promise<void> {
	const deadline = Date.now() + SERVICES_TIMEOUT_MS;
	let pending = services;
	while (Date.now() < deadline) {
		const statuses = pending.map((service) => ({
			service,
			status: inspectService(runtime, envName, service),
		}));
		for (const { service, status } of statuses) {
			if (
				status &&
				(status.state === 'exited' || status.state === 'dead' || status.health === 'unhealthy')
			) {
				throw new RigError(
					`The ${service} container is ${status.health === 'unhealthy' ? 'unhealthy' : status.state}.`,
					`Check its logs with \`${runtime} logs ${containerName(envName, service)}\`.`,
				);
			}
		}
		pending = statuses
			.filter(
				({ status }) =>
					!status ||
					status.state !== 'running' ||
					(status.health !== '' && status.health !== 'healthy'),
			)
			.map(({ service }) => service);
		if (pending.length === 0) return;
		await sleep(500);
	}
	throw new RigError(
		`${pending.join(', ')} did not become ready within ${SERVICES_TIMEOUT_MS / 1000} seconds.`,
		`Check the logs with \`${runtime} logs ${containerName(envName, pending[0])}\`.`,
	);
}

export async function servicesUp(
	envName: string,
	topology: Topology,
	paths: EnvPaths,
): Promise<ServiceName[]> {
	const needed = requiredServices(topology);
	if (needed.length === 0) {
		await servicesDown(envName, paths);
		writeCompose(envName, topology, paths);
		clearTunnelUrl(paths);
		return [];
	}
	writeCompose(envName, topology, paths);
	const runtime = await ensureContainerRuntime();
	assertRuntimeRunning(runtime);
	const token = tunnelToken(paths, topology);
	// No `--wait`: podman-compose does not have it. rig waits with `inspect`.
	await run(runtime, composeArgs(envName, paths, ['up', '-d', '--remove-orphans']), {
		env: token ? { [TUNNEL_TOKEN_KEY]: token } : {},
	});
	await waitForServices(runtime, envName, needed);
	if (needed.includes('tunnel')) await waitForTunnel(paths, topology, runtime);
	else clearTunnelUrl(paths);
	return needed;
}

/** The runtime for commands that only read or stop: no question, undefined when none runs. */
function runningRuntime(): ContainerRuntime | undefined {
	try {
		const runtime = containerRuntime();
		return serverVersion(runtime) === undefined ? undefined : runtime;
	} catch {
		return undefined;
	}
}

export async function servicesDown(
	envName: string,
	paths: EnvPaths,
	options: { volumes?: boolean } = {},
): Promise<void> {
	// An environment without services has no compose file.
	if (!existsSync(paths.compose)) return;
	let runtime: ContainerRuntime | undefined;
	if (options.volumes) {
		// A delete must not report success when the volumes are still there.
		try {
			runtime = containerRuntime();
		} catch {
			// No runtime is installed, so no volumes are left.
			return;
		}
		assertRuntimeRunning(runtime);
	} else {
		runtime = runningRuntime();
		if (!runtime) return;
	}
	const args = ['down', '--remove-orphans'];
	if (options.volumes) args.push('--volumes');
	// `down` reads the compose file, which names the token variable. An empty value is enough.
	await run(runtime, composeArgs(envName, paths, args), { env: { [TUNNEL_TOKEN_KEY]: '' } });
	// A quick tunnel gets a new URL when it starts again.
	clearTunnelUrl(paths);
}

export function servicesStatus(envName: string, topology: Topology): ServiceStatus[] {
	const runtime = runningRuntime();
	if (!runtime) return [];
	return requiredServices(topology)
		.map((service) => inspectService(runtime, envName, service))
		.filter((status): status is ServiceStatus => status !== undefined);
}

/** Runs a command in a service container with the terminal attached. */
export function execInService(envName: string, service: ServiceName, command: string[]): number {
	const runtime = containerRuntime();
	assertRuntimeRunning(runtime);
	const tty = process.stdin.isTTY ? ['-it'] : ['-i'];
	const result = spawnSync(runtime, ['exec', ...tty, containerName(envName, service), ...command], {
		stdio: 'inherit',
	});
	return result.status ?? 1;
}

/** The URL of the Mailpit UI, where the emails of n8n show. */
export function mailpitUrl(topology: Topology): string {
	return `http://127.0.0.1:${mailpitUiPort(topology)}`;
}

/** Where a service answers: a local port, or the public URL of the tunnel. */
export function serviceAddress(topology: Topology, paths: EnvPaths, service: ServiceName): string {
	if (service === 'mailpit') {
		return `SMTP 127.0.0.1:${servicePort(topology, 'mailpit')} · UI ${mailpitUrl(topology)}`;
	}
	if (service !== 'tunnel') return `127.0.0.1:${servicePort(topology, service)}`;
	const url = readTunnelUrl(paths, topology);
	return `${url ?? 'no URL yet'} → ${topology.tunnel.target}`;
}
