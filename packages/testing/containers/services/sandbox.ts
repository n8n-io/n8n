import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StartedNetwork, StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { Service, ServiceResult } from './types';

const API_HOSTNAME = 'sandbox-api';
const RUNNER_HOSTNAME = 'sandbox-runner-1';
const API_HTTP_PORT = 8080;
const API_GRPC_PORT = 9090;

const API_KEY = 'n8n-sandbox-ci-key';
const RUNNER_API_KEY = 'ci-runner-key';
const REGISTRATION_TOKEN = 'ci-reg-token';

export interface SandboxMeta {
	apiUrl: string;
	apiKey: string;
}

export type SandboxResult = ServiceResult<SandboxMeta> & {
	containers: StartedTestContainer[];
};

async function generateMtlsCerts(network: StartedNetwork, projectName: string): Promise<string> {
	const tlsDir = mkdtempSync(join(tmpdir(), `${projectName}-sandbox-tls-`));
	const { consumer, throwWithLogs } = createSilentLogConsumer();

	try {
		const certContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.sandboxApi)
			.withName(`${projectName}-sandbox-cert-gen`)
			.withNetwork(network)
			.withUser('0:0')
			.withEntrypoint(['sh'])
			.withCommand([
				'-c',
				'bootstrap-mtls.sh --out-dir /tls --api-san sandbox-api --control-san-prefix sandbox-runner --world-readable && chown -R sandbox-api:sandbox-api /tls/api',
			])
			.withBindMounts([{ source: tlsDir, target: '/tls', mode: 'rw' }])
			.withEnvironment({ NUM_RUNNERS: '1' })
			.withWaitStrategy(Wait.forSuccessfulCommand('test -f /tls/api/grpc-server.crt'))
			.withLogConsumer(consumer)
			.start();
		await certContainer.stop();
	} catch (error: unknown) {
		return throwWithLogs(error);
	}

	return tlsDir;
}

export const sandbox: Service<SandboxResult> = {
	description: 'Sandbox service (API + runner)',

	async start(network: StartedNetwork, projectName: string): Promise<SandboxResult> {
		const tlsDir = await generateMtlsCerts(network, projectName);
		const { consumer: apiConsumer, throwWithLogs: throwApiLogs } = createSilentLogConsumer();
		const { consumer: runnerConsumer, throwWithLogs: throwRunnerLogs } = createSilentLogConsumer();

		let apiContainer: StartedTestContainer;
		try {
			apiContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.sandboxApi)
				.withName(`${projectName}-${API_HOSTNAME}`)
				.withNetwork(network)
				.withNetworkAliases(API_HOSTNAME)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': API_HOSTNAME,
				})
				.withBindMounts([{ source: join(tlsDir, 'api'), target: '/tls', mode: 'ro' }])
				.withEnvironment({
					SANDBOX_API_KEYS: API_KEY,
					SANDBOX_API_RUNNER_REGISTRATION_TOKEN: REGISTRATION_TOKEN,
					SANDBOX_API_RUNNER_API_KEY: RUNNER_API_KEY,
					SANDBOX_API_GRPC_TLS_CERT_FILE: '/tls/grpc-server.crt',
					SANDBOX_API_GRPC_TLS_KEY_FILE: '/tls/grpc-server.key',
					SANDBOX_API_GRPC_TLS_CLIENT_CA_FILE: '/tls/ca.crt',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CA_FILE: '/tls/ca.crt',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CERT_FILE: '/tls/control-grpc-api-client.crt',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_KEY_FILE: '/tls/control-grpc-api-client.key',
					SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_SERVER_NAME: RUNNER_HOSTNAME,
					SANDBOX_API_LOG_LEVEL: 'warn',
				})
				.withExposedPorts(API_HTTP_PORT, API_GRPC_PORT)
				.withWaitStrategy(
					Wait.forHttp('/healthz', API_HTTP_PORT).forStatusCode(200).withStartupTimeout(60_000),
				)
				.withLogConsumer(apiConsumer)
				.withReuse()
				.start();
		} catch (error: unknown) {
			return throwApiLogs(error);
		}

		let runnerContainer: StartedTestContainer;
		try {
			runnerContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.sandboxRunner)
				.withName(`${projectName}-${RUNNER_HOSTNAME}`)
				.withNetwork(network)
				.withNetworkAliases(RUNNER_HOSTNAME)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': RUNNER_HOSTNAME,
				})
				.withPrivilegedMode()
				.withBindMounts([{ source: join(tlsDir, 'runner'), target: '/tls', mode: 'ro' }])
				.withEnvironment({
					SANDBOX_RUNNER_API_KEYS: RUNNER_API_KEY,
					SANDBOX_RUNNER_REGISTRATION_TOKEN: REGISTRATION_TOKEN,
					SANDBOX_RUNNER_API_GRPC_ADDR: `${API_HOSTNAME}:${API_GRPC_PORT}`,
					SANDBOX_RUNNER_HTTP_BASE_URL: `http://${RUNNER_HOSTNAME}:${API_HTTP_PORT}`,
					SANDBOX_RUNNER_CONTROL_GRPC_LISTEN_ADDR: ':9091',
					SANDBOX_RUNNER_CONTROL_GRPC_ADVERTISE_ADDR: `${RUNNER_HOSTNAME}:9091`,
					SANDBOX_RUNNER_ID: 'ci-runner-1',
					SANDBOX_RUNNER_DOCKER_SANDBOX_IMAGE: TEST_CONTAINER_IMAGES.sandboxSandbox,
					SANDBOX_RUNNER_LOG_LEVEL: 'warn',
					SANDBOX_RUNNER_REGISTRATION_GRPC_CA_FILE: '/tls/ca.crt',
					SANDBOX_RUNNER_REGISTRATION_GRPC_CERT_FILE: '/tls/grpc-client.crt',
					SANDBOX_RUNNER_REGISTRATION_GRPC_KEY_FILE: '/tls/grpc-client.key',
					SANDBOX_RUNNER_REGISTRATION_GRPC_SERVER_NAME: API_HOSTNAME,
					SANDBOX_RUNNER_CONTROL_GRPC_TLS_CERT_FILE: '/tls/control-grpc-server.crt',
					SANDBOX_RUNNER_CONTROL_GRPC_TLS_KEY_FILE: '/tls/control-grpc-server.key',
					SANDBOX_RUNNER_CONTROL_GRPC_TLS_CLIENT_CA_FILE: '/tls/ca.crt',
				})
				.withExposedPorts(API_HTTP_PORT)
				.withWaitStrategy(
					Wait.forHttp('/healthz', API_HTTP_PORT)
						.forResponsePredicate((res) => res === '')
						.withStartupTimeout(120_000),
				)
				.withLogConsumer(runnerConsumer)
				.withReuse()
				.start();
		} catch (error: unknown) {
			return throwRunnerLogs(error);
		}

		return {
			container: apiContainer,
			containers: [apiContainer, runnerContainer],
			meta: {
				apiUrl: `http://${API_HOSTNAME}:${API_HTTP_PORT}`,
				apiKey: API_KEY,
			},
		};
	},

	env(result: SandboxResult, external?: boolean): Record<string, string> {
		if (external) {
			const host = result.container.getHost();
			const port = result.container.getMappedPort(API_HTTP_PORT);
			return {
				N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'n8n-sandbox',
				N8N_SANDBOX_SERVICE_URL: `http://${host}:${port}`,
				N8N_SANDBOX_SERVICE_API_KEY: API_KEY,
			};
		}
		return {
			N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'n8n-sandbox',
			N8N_SANDBOX_SERVICE_URL: result.meta.apiUrl,
			N8N_SANDBOX_SERVICE_API_KEY: result.meta.apiKey,
		};
	},
};
