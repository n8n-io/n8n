import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	GenericContainer,
	type StartedNetwork,
	type StartedTestContainer,
	Wait,
} from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

const API_HOST = 'sandbox-api';
const RUNNER_HOST = 'sandbox-runner-1';
const RUNNER_CONTROL_HOST_PREFIX = 'sandbox-runner';

const API_HTTP_PORT = 8080;
const RUNNER_HTTP_PORT = 8080;

const API_KEY = 'n8n-sandbox-ci-key';
const RUNNER_REGISTRATION_TOKEN = 'ci-reg-token';
const RUNNER_API_KEY = 'ci-runner-key';

export interface N8nSandboxMeta {
	internalServiceUrl: string;
	externalServiceUrl: string;
	apiKey: string;
	tlsDir: string;
}

export type N8nSandboxResult = ServiceResult<N8nSandboxMeta> & {
	containers: StartedTestContainer[];
};

function labelsFor(projectName: string, service: string): Record<string, string> {
	return {
		'com.docker.compose.project': projectName,
		'com.docker.compose.service': service,
	};
}

function formatExecFailure(operation: string, output: string): Error {
	return new Error(`${operation} failed:\n${output}`);
}

async function generateMtlsCertificates(
	network: StartedNetwork,
	projectName: string,
	tlsDir: string,
	consumer: ReturnType<typeof createSilentLogConsumer>['consumer'],
): Promise<void> {
	let bootstrapContainer: StartedTestContainer | undefined;
	try {
		bootstrapContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.n8nSandboxServiceApi)
			.withName(`${projectName}-sandbox-bootstrap`)
			.withNetwork(network)
			.withUser('root')
			.withBindMounts([{ source: tlsDir, target: '/tls', mode: 'rw' }])
			.withEntrypoint(['sh'])
			.withCommand(['-c', 'sleep infinity'])
			.withLabels(labelsFor(projectName, 'sandbox-bootstrap'))
			.withLogConsumer(consumer)
			.start();

		const command = [
			'sh',
			'-c',
			[
				'NUM_RUNNERS=1',
				'bootstrap-mtls.sh',
				'--out-dir /tls',
				`--api-san ${API_HOST}`,
				`--control-san-prefix ${RUNNER_CONTROL_HOST_PREFIX}`,
				'--world-readable',
			].join(' '),
		];
		const result = await bootstrapContainer.exec(command);
		if (result.exitCode !== 0) {
			throw formatExecFailure('n8n sandbox mTLS bootstrap', result.output);
		}
	} finally {
		if (bootstrapContainer) {
			await bootstrapContainer.stop();
		}
	}
}

export const n8nSandbox: Service<N8nSandboxResult> = {
	description: 'n8n Sandbox Service',

	async start(network: StartedNetwork, projectName: string): Promise<N8nSandboxResult> {
		const { consumer, throwWithLogs } = createSilentLogConsumer();
		const tlsDir = await mkdtemp(join(tmpdir(), `${projectName}-sandbox-tls-`));

		try {
			await generateMtlsCertificates(network, projectName, tlsDir, consumer);

			const apiContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.n8nSandboxServiceApi)
				.withName(`${projectName}-${API_HOST}`)
				.withNetwork(network)
				.withNetworkAliases(API_HOST)
				.withExposedPorts(API_HTTP_PORT)
				.withBindMounts([{ source: join(tlsDir, 'api'), target: '/tls', mode: 'ro' }])
				.withEnvironment({
					SANDBOX_API_KEYS: API_KEY,
					SANDBOX_API_RUNNER_REGISTRATION_TOKEN: RUNNER_REGISTRATION_TOKEN,
					SANDBOX_API_RUNNER_API_KEY: RUNNER_API_KEY,
					SANDBOX_API_GRPC_TLS_CERT_FILE: '/tls/grpc-server.crt',
					SANDBOX_API_GRPC_TLS_KEY_FILE: '/tls/grpc-server.key',
					SANDBOX_API_GRPC_TLS_CLIENT_CA_FILE: '/tls/ca.crt',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CA_FILE: '/tls/ca.crt',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CERT_FILE: '/tls/control-grpc-api-client.crt',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_KEY_FILE: '/tls/control-grpc-api-client.key',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_SERVER_NAME: RUNNER_HOST,
					SANDBOX_API_LOG_LEVEL: 'warn',
				})
				.withWaitStrategy(
					Wait.forHttp('/healthz', API_HTTP_PORT).forStatusCode(200).withStartupTimeout(60000),
				)
				.withLabels(labelsFor(projectName, API_HOST))
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			const runnerContainer = await new GenericContainer(
				TEST_CONTAINER_IMAGES.n8nSandboxServiceRunner,
			)
				.withName(`${projectName}-${RUNNER_HOST}`)
				.withNetwork(network)
				.withNetworkAliases(RUNNER_HOST)
				.withPrivilegedMode()
				.withExposedPorts(RUNNER_HTTP_PORT)
				.withBindMounts([{ source: join(tlsDir, 'runner'), target: '/tls', mode: 'ro' }])
				.withEnvironment({
					SANDBOX_RUNNER_API_KEYS: RUNNER_API_KEY,
					SANDBOX_RUNNER_REGISTRATION_TOKEN: RUNNER_REGISTRATION_TOKEN,
					SANDBOX_RUNNER_API_GRPC_ADDR: `${API_HOST}:9090`,
					SANDBOX_RUNNER_HTTP_BASE_URL: `http://${RUNNER_HOST}:${RUNNER_HTTP_PORT}`,
					SANDBOX_RUNNER_CONTROL_GRPC_LISTEN_ADDR: ':9091',
					SANDBOX_RUNNER_CONTROL_GRPC_ADVERTISE_ADDR: `${RUNNER_HOST}:9091`,
					SANDBOX_RUNNER_ID: 'ci-runner-1',
					SANDBOX_RUNNER_DOCKER_SANDBOX_IMAGE: TEST_CONTAINER_IMAGES.n8nSandboxServiceSandbox,
					SANDBOX_RUNNER_LOG_LEVEL: 'warn',
					SANDBOX_RUNNER_REGISTRATION_GRPC_CA_FILE: '/tls/ca.crt',
					SANDBOX_RUNNER_REGISTRATION_GRPC_CERT_FILE: '/tls/grpc-client.crt',
					SANDBOX_RUNNER_REGISTRATION_GRPC_KEY_FILE: '/tls/grpc-client.key',
					SANDBOX_RUNNER_REGISTRATION_GRPC_SERVER_NAME: API_HOST,
					SANDBOX_RUNNER_CONTROL_GRPC_TLS_CERT_FILE: '/tls/control-grpc-server.crt',
					SANDBOX_RUNNER_CONTROL_GRPC_TLS_KEY_FILE: '/tls/control-grpc-server.key',
					SANDBOX_RUNNER_CONTROL_GRPC_TLS_CLIENT_CA_FILE: '/tls/ca.crt',
				})
				.withWaitStrategy(
					Wait.forHttp('/healthz', RUNNER_HTTP_PORT)
						.withHeaders({ 'X-Api-Key': RUNNER_API_KEY })
						.forStatusCode(200)
						.withStartupTimeout(120000),
				)
				.withLabels(labelsFor(projectName, RUNNER_HOST))
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			const externalServiceUrl = `http://${apiContainer.getHost()}:${apiContainer.getMappedPort(
				API_HTTP_PORT,
			)}`;

			return {
				container: apiContainer,
				containers: [apiContainer, runnerContainer],
				meta: {
					internalServiceUrl: `http://${API_HOST}:${API_HTTP_PORT}`,
					externalServiceUrl,
					apiKey: API_KEY,
					tlsDir,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(result: N8nSandboxResult, external?: boolean): Record<string, string> {
		return {
			N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
			N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'n8n-sandbox',
			N8N_SANDBOX_SERVICE_URL: external
				? result.meta.externalServiceUrl
				: result.meta.internalServiceUrl,
			N8N_SANDBOX_SERVICE_API_KEY: result.meta.apiKey,
		};
	},

	async verifyFromN8n(
		result: N8nSandboxResult,
		n8nContainers: StartedTestContainer[],
	): Promise<void> {
		const healthUrl = `${result.meta.internalServiceUrl}/healthz`;
		const script = `
const url = ${JSON.stringify(healthUrl)};
const apiKey = ${JSON.stringify(result.meta.apiKey)};
fetch(url, { headers: { 'X-Api-Key': apiKey } })
  .then((response) => {
    if (!response.ok) {
      console.error('Unexpected status', response.status);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;

		for (const container of n8nContainers) {
			const check = await container.exec(['node', '-e', script]);
			if (check.exitCode !== 0) {
				throw formatExecFailure(
					`${container.getName()} could not reach n8n sandbox service`,
					check.output,
				);
			}
		}
	},
};
