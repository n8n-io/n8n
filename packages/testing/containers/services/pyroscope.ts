import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

const HOSTNAME = 'pyroscope';
export const PYROSCOPE_PORT = 4040;

export interface PyroscopeMeta {
	uiUrl: string;
	internalEndpoint: string;
}

export type PyroscopeResult = ServiceResult<PyroscopeMeta>;

export const pyroscope: Service<PyroscopeResult> = {
	description: 'Pyroscope (continuous profiling)',

	async start(network: StartedNetwork, projectName: string): Promise<PyroscopeResult> {
		const container = await new GenericContainer(TEST_CONTAINER_IMAGES.pyroscope)
			.withName(`${projectName}-${HOSTNAME}`)
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withExposedPorts(PYROSCOPE_PORT)
			.withWaitStrategy(
				Wait.forHttp('/ready', PYROSCOPE_PORT).forStatusCode(200).withStartupTimeout(120000),
			)
			.withReuse()
			.start();

		return {
			container,
			meta: {
				uiUrl: `http://localhost:${container.getMappedPort(PYROSCOPE_PORT)}`,
				internalEndpoint: `http://${HOSTNAME}:${PYROSCOPE_PORT}`,
			},
		};
	},

	env(result, external): Record<string, string> {
		return {
			N8N_PROFILING_PYROSCOPE_URL: external ? result.meta.uiUrl : result.meta.internalEndpoint,
		};
	},
};
