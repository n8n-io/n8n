import { realpathSync } from 'node:fs';
import { GenericContainer, Wait } from 'testcontainers';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

/**
 * Resolves the host's Docker socket path. On Docker Desktop, `/var/run/docker.sock`
 * is a symlink (typically to `~/.docker/run/docker.sock`); bind-mounting the
 * symlink path directly preserves the symlink but the target doesn't exist
 * inside the container, so cAdvisor can't reach the daemon. Resolving to the
 * real path makes the bind mount work in both environments.
 */
function resolveDockerSocket(): string {
	try {
		return realpathSync('/var/run/docker.sock');
	} catch {
		return '/var/run/docker.sock';
	}
}

const HOSTNAME = 'cadvisor';
export const CADVISOR_PORT = 8080;

export interface CadvisorMeta {
	host: string;
	port: number;
}

export type CadvisorResult = ServiceResult<CadvisorMeta>;

/**
 * Runs cAdvisor to expose per-container CPU, memory, network, and disk metrics
 * in Prometheus format on /metrics. VictoriaMetrics scrapes this endpoint, making
 * `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`,
 * `container_fs_reads_bytes_total`, `container_fs_writes_bytes_total`, etc.
 * queryable via PromQL during benchmarks.
 *
 * Lets benchmark reporters answer "was Postgres CPU-saturated?" and
 * "did the n8n main hit memory limits?" at scrape granularity rather than a
 * single end-of-run snapshot. Opt-in only — adds ~150 MB resident and is only
 * useful for load tests.
 */
export const cadvisor: Service<CadvisorResult> = {
	description: 'cAdvisor (container metrics)',

	async start(network: StartedNetwork, projectName: string): Promise<CadvisorResult> {
		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.cadvisor)
			.withName(`${projectName}-${HOSTNAME}`)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withBindMounts([
				{ source: '/', target: '/rootfs', mode: 'ro' },
				// Bind the resolved socket file (not the parent dir). Docker Desktop's
				// /var/run/docker.sock is a symlink to ~/.docker/run/docker.sock;
				// mounting the parent dir preserves the symlink but the target path
				// doesn't exist inside the container, so the docker factory fails to
				// register. Mounting the resolved path works in both Linux CI and
				// Docker Desktop.
				{ source: resolveDockerSocket(), target: '/var/run/docker.sock', mode: 'rw' },
				{ source: '/sys', target: '/sys', mode: 'ro' },
				{ source: '/var/lib/docker/', target: '/var/lib/docker', mode: 'ro' },
			])
			.withPrivilegedMode()
			.withExposedPorts(CADVISOR_PORT)
			.withCommand([
				// IMPORTANT: do NOT set --store_container_labels=false. That flag
				// drops the `container_label_*` series, which is what we match on
				// in PromQL (`container_label_com_docker_compose_service`).
				// Whitelist limits label cardinality without killing the labels we
				// actually query.
				'--whitelisted_container_labels=com.docker.compose.project,com.docker.compose.service',
				// Drop --docker_only=true: when the daemon connection fails (Docker
				// Desktop), this would suppress every container — leaving only the
				// host cgroup. Without the flag, cAdvisor falls back to systemd /
				// raw factories and still emits cgroup-derived metrics.
				'--housekeeping_interval=2s',
				'--allow_dynamic_housekeeping=true',
			])
			.withWaitStrategy(
				Wait.forHttp('/metrics', CADVISOR_PORT).forStatusCode(200).withStartupTimeout(60000),
			)
			.withReuse()
			.start();

		return {
			container,
			meta: {
				host: HOSTNAME,
				port: CADVISOR_PORT,
			},
		};
	},
};
