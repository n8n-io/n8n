import { realpathSync } from 'node:fs';
import { GenericContainer, Wait } from 'testcontainers';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

// On Docker Desktop, `/var/run/docker.sock` is a symlink to
// `~/.docker/run/docker.sock`. Bind-mounting the symlink path preserves the
// link but the target doesn't exist inside the container, so cAdvisor's
// docker factory fails to register. Resolving to the real path works in both
// Linux CI and Docker Desktop.
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
				{ source: resolveDockerSocket(), target: '/var/run/docker.sock', mode: 'rw' },
				{ source: '/sys', target: '/sys', mode: 'ro' },
				{ source: '/var/lib/docker/', target: '/var/lib/docker', mode: 'ro' },
			])
			.withPrivilegedMode()
			.withExposedPorts(CADVISOR_PORT)
			.withCommand([
				// PromQL queries match on `container_label_com_docker_compose_service`;
				// the whitelist keeps that label without unbounded cardinality.
				'--whitelisted_container_labels=com.docker.compose.project,com.docker.compose.service',
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
