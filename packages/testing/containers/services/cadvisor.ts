import { GenericContainer, Wait } from 'testcontainers';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

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
				{ source: '/var/run', target: '/var/run', mode: 'ro' },
				{ source: '/sys', target: '/sys', mode: 'ro' },
				{ source: '/var/lib/docker/', target: '/var/lib/docker', mode: 'ro' },
			])
			.withPrivilegedMode()
			.withExposedPorts(CADVISOR_PORT)
			.withCommand([
				// Disable internal storage to keep memory low — VictoriaMetrics holds the time series.
				'--store_container_labels=false',
				'--docker_only=true',
				'--housekeeping_interval=2s',
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
