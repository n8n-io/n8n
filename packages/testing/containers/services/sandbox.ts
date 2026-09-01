import { execFile } from 'node:child_process';
import { chmodSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
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
const SANDBOX_READY_TIMEOUT_MS = 120_000;
/** Preflight only — a slow answer means fall back, not wait it out. */
const HOSTED_HEALTH_TIMEOUT_MS = 10_000;
const SANDBOX_READY_POLL_INTERVAL_MS = 1_000;
const DOCKER_COMMAND_MAX_BUFFER = 10 * 1024 * 1024;

const execFileAsync = promisify(execFile);

export interface SandboxMeta {
	apiUrl: string;
	apiKey: string;
}

export type SandboxResult = ServiceResult<SandboxMeta> & {
	containers: StartedTestContainer[];
};

const CERT_GEN_SENTINEL = 'SANDBOX_CERTS_READY';

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

async function ensureHostDockerImage(image: string): Promise<void> {
	try {
		await execFileAsync('docker', ['image', 'inspect', image], {
			maxBuffer: DOCKER_COMMAND_MAX_BUFFER,
		});
	} catch {
		await execFileAsync('docker', ['pull', image], { maxBuffer: DOCKER_COMMAND_MAX_BUFFER });
	}
}

async function loadSandboxImageIntoRunner(
	runnerContainer: StartedTestContainer,
	image: string,
): Promise<void> {
	await ensureHostDockerImage(image);

	const runnerName = runnerContainer.getName().replace(/^\//, '');
	await execFileAsync(
		'sh',
		[
			'-lc',
			`docker save ${shellQuote(image)} | docker exec -i ${shellQuote(runnerName)} docker load`,
		],
		{ maxBuffer: DOCKER_COMMAND_MAX_BUFFER },
	);
}

async function waitForSandboxApiReady(apiContainer: StartedTestContainer): Promise<void> {
	const host = apiContainer.getHost();
	const port = apiContainer.getMappedPort(API_HTTP_PORT);
	const baseUrl = `http://${host}:${port}`;
	const deadline = Date.now() + SANDBOX_READY_TIMEOUT_MS;
	let lastError = 'sandbox API was not ready';

	while (Date.now() < deadline) {
		try {
			const createResponse = await fetch(`${baseUrl}/sandboxes`, {
				method: 'POST',
				headers: { 'X-Api-Key': API_KEY },
			});

			if (createResponse.ok) {
				const sandbox = (await createResponse.json()) as { id?: string };
				if (sandbox.id) {
					await fetch(`${baseUrl}/sandboxes/${sandbox.id}`, {
						method: 'DELETE',
						headers: { 'X-Api-Key': API_KEY },
					}).catch(() => {});
				}
				return;
			}

			lastError = `${createResponse.status} ${await createResponse.text()}`;
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
		}

		await new Promise((resolve) => setTimeout(resolve, SANDBOX_READY_POLL_INTERVAL_MS));
	}

	throw new Error(`Sandbox service did not become ready: ${lastError}`);
}

async function generateMtlsCerts(network: StartedNetwork, projectName: string): Promise<string> {
	const tlsDir = mkdtempSync(join(tmpdir(), `${projectName}-sandbox-tls-`));
	chmodSync(tlsDir, 0o755);
	const { consumer, throwWithLogs } = createSilentLogConsumer();

	try {
		const certContainer = await new GenericContainer(TEST_CONTAINER_IMAGES.sandboxApi)
			.withName(`${projectName}-sandbox-cert-gen`)
			.withNetwork(network)
			.withUser('0:0')
			.withEntrypoint(['sh'])
			.withCommand([
				'-c',
				[
					'bootstrap-mtls.sh --out-dir /tls --api-san sandbox-api --control-san-prefix sandbox-runner --world-readable',
					'chown -R sandbox-api:sandbox-api /tls/api',
					'chmod -R a+rX /tls',
					`echo ${CERT_GEN_SENTINEL}`,
				].join(' && '),
			])
			.withBindMounts([{ source: tlsDir, target: '/tls', mode: 'rw' }])
			.withEnvironment({ NUM_RUNNERS: '1' })
			.withWaitStrategy(Wait.forLogMessage(CERT_GEN_SENTINEL))
			.withLogConsumer(consumer)
			.start();
		await certContainer.stop();
	} catch (error: unknown) {
		return throwWithLogs(error);
	}

	return tlsDir;
}

/**
 * A deployed sandbox service, as configured in the host environment — CI passes
 * both vars as secrets, and a local run gets the same path by exporting them.
 * Config alone is not enough to use it: `hostedEnv` still has to reach it. With
 * a var missing (fork PRs have no secrets) the local containers start instead.
 */
function hostedSandboxConfig(): SandboxMeta | undefined {
	// Trailing slash stripped once, here: everything downstream appends `/sandboxes`
	// and would otherwise build `//sandboxes`.
	const apiUrl = process.env.N8N_SANDBOX_SERVICE_URL?.trim().replace(/\/+$/, '');
	const apiKey = process.env.N8N_SANDBOX_SERVICE_API_KEY?.trim();
	if (!apiUrl || !apiKey) return undefined;
	return { apiUrl, apiKey };
}

/**
 * `GET /sandboxes` is the cheapest call that proves the whole chain the tests
 * depend on: the deployment answers from this machine, and the key resolves to
 * a tenant. `/healthz` would be wrong here — it is unauthenticated and returns
 * a static 200, so it passes with a revoked or misspelled key.
 *
 * Returns `true` when healthy, otherwise the reason to report.
 */
async function checkHostedSandbox(meta: SandboxMeta): Promise<true | string> {
	try {
		const response = await fetch(`${meta.apiUrl}/sandboxes`, {
			headers: { 'X-Api-Key': meta.apiKey },
			signal: AbortSignal.timeout(HOSTED_HEALTH_TIMEOUT_MS),
		});
		if (response.ok) return true;
		return `HTTP ${response.status} ${(await response.text().catch(() => '')).slice(0, 200)}`.trim();
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

export const sandbox: Service<SandboxResult> = {
	description: 'Sandbox service (API + runner)',

	async hostedEnv(): Promise<Record<string, string> | undefined> {
		const hosted = hostedSandboxConfig();
		if (!hosted) return undefined;

		const health = await checkHostedSandbox(hosted);
		if (health !== true) {
			// An outage in the deployment must not turn every instance-ai spec red, so
			// hand the run back to the local stack. Warn rather than log: the run stays
			// green but slower, and someone still has to go look at the deployment.
			const message = `Hosted sandbox service is not usable (${health}) — falling back to the local sandbox stack`;
			// GitHub surfaces `::warning::` in the run summary, so the downgrade doesn't
			// hide behind thousands of lines of test output.
			console.warn(
				process.env.GITHUB_ACTIONS === 'true' ? `::warning::${message}` : `⚠ ${message}`,
			);
			return undefined;
		}

		// One URL for both n8n-in-network and host callers — it isn't stack-local.
		return {
			N8N_INSTANCE_AI_SANDBOX_PROVIDER: 'n8n-sandbox',
			N8N_SANDBOX_SERVICE_URL: hosted.apiUrl,
			N8N_SANDBOX_SERVICE_API_KEY: hosted.apiKey,
		};
	},

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
					Wait.forSuccessfulCommand(
						`wget -q -O /dev/null --header='X-Api-Key: ${RUNNER_API_KEY}' http://localhost:${API_HTTP_PORT}/healthz`,
					).withStartupTimeout(120_000),
				)
				.withLogConsumer(runnerConsumer)
				.withReuse()
				.start();
		} catch (error: unknown) {
			return throwRunnerLogs(error);
		}

		await loadSandboxImageIntoRunner(runnerContainer, TEST_CONTAINER_IMAGES.sandboxSandbox);
		await waitForSandboxApiReady(apiContainer);

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
