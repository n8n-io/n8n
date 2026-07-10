import {
	CreateSecretCommand,
	DeleteSecretCommand,
	GetSecretValueCommand,
	ListSecretsCommand,
	SecretsManagerClient as AwsSecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'localstack';
const EDGE_PORT = 4566;
const DEFAULT_REGION = 'us-east-1';

export interface LocalStackMeta {
	endpoint: string;
	internalEndpoint: string;
}

export type LocalStackResult = ServiceResult<LocalStackMeta>;

interface LocalStackHealthResponse {
	services?: Record<string, string>;
}

export const localstack: Service<LocalStackResult> = {
	description: 'AWS service emulator (LocalStack)',

	async start(network: StartedNetwork, projectName: string): Promise<LocalStackResult> {
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.localstack)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withExposedPorts(EDGE_PORT)
				.withEnvironment({
					SERVICES: 'secretsmanager',
					DEFAULT_REGION,
					// Disable LocalStack Pro features we don't need
					SKIP_SSL_CERT_DOWNLOAD: '1',
				})
				.withWaitStrategy(
					Wait.forAll([
						Wait.forListeningPorts(),
						Wait.forHttp('/_localstack/health', EDGE_PORT)
							.forStatusCode(200)
							.forResponsePredicate((body: string) => {
								try {
									const health = JSON.parse(body) as LocalStackHealthResponse;
									// LocalStack returns 'available' for ready services
									return health.services?.secretsmanager === 'available';
								} catch {
									return false;
								}
							})
							.withStartupTimeout(120000),
					]),
				)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withReuse()
				.withLogConsumer(consumer)
				.start();

			const hostPort = container.getMappedPort(EDGE_PORT);

			return {
				container,
				meta: {
					endpoint: `http://${container.getHost()}:${hostPort}`,
					internalEndpoint: `http://${HOSTNAME}:${EDGE_PORT}`,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(result: LocalStackResult, external?: boolean): Record<string, string> {
		return {
			AWS_ENDPOINT_URL: external ? result.meta.endpoint : result.meta.internalEndpoint,
			AWS_ACCESS_KEY_ID: 'test',
			AWS_SECRET_ACCESS_KEY: 'test',
			AWS_DEFAULT_REGION: DEFAULT_REGION,
		};
	},
};

/**
 * Client for interacting with AWS Secrets Manager via LocalStack.
 * Uses the official AWS SDK for proper API compatibility.
 */
export class SecretsManagerClient {
	private readonly client: AwsSecretsManagerClient;

	constructor(endpoint: string) {
		this.client = new AwsSecretsManagerClient({
			endpoint,
			region: DEFAULT_REGION,
			credentials: {
				accessKeyId: 'test',
				secretAccessKey: 'test',
			},
		});
	}

	/**
	 * Create a secret.
	 * @param name - Secret name
	 * @param value - Secret value (string or object that will be JSON-serialized)
	 */
	async createSecret(name: string, value: string | Record<string, unknown>): Promise<void> {
		const secretString = typeof value === 'string' ? value : JSON.stringify(value);

		await this.client.send(
			new CreateSecretCommand({
				Name: name,
				SecretString: secretString,
			}),
		);
	}

	/**
	 * Get a secret value.
	 * @param name - Secret name
	 * @returns The secret string value
	 */
	async getSecret(name: string): Promise<string> {
		const response = await this.client.send(
			new GetSecretValueCommand({
				SecretId: name,
			}),
		);

		if (!response.SecretString) {
			throw new Error(`Secret '${name}' has no string value`);
		}
		return response.SecretString;
	}

	/**
	 * Delete a secret.
	 * @param name - Secret name
	 * @param forceDelete - If true, deletes immediately without recovery window
	 */
	async deleteSecret(name: string, forceDelete = true): Promise<void> {
		try {
			await this.client.send(
				new DeleteSecretCommand({
					SecretId: name,
					ForceDeleteWithoutRecovery: forceDelete,
				}),
			);
		} catch (error) {
			// Ignore "not found" errors during cleanup
			if (error instanceof Error && error.name !== 'ResourceNotFoundException') {
				throw error;
			}
		}
	}

	/**
	 * List all secret names.
	 * @returns Array of secret names
	 */
	async listSecrets(): Promise<string[]> {
		const names: string[] = [];
		let nextToken: string | undefined;

		do {
			const response = await this.client.send(
				new ListSecretsCommand({
					NextToken: nextToken,
				}),
			);

			for (const secret of response.SecretList ?? []) {
				if (secret.Name) names.push(secret.Name);
			}

			nextToken = response.NextToken;
		} while (nextToken);

		return names;
	}

	/**
	 * Delete all secrets. Useful for cleanup between tests.
	 */
	async clear(): Promise<void> {
		const secrets = await this.listSecrets();
		await Promise.all(secrets.map(async (name) => await this.deleteSecret(name)));
	}

	/**
	 * Wait for a secret to exist. Useful for eventual consistency scenarios.
	 * @param name - Secret name to wait for
	 * @param options - Timeout and polling options
	 * @returns The secret value once it exists
	 */
	async waitForSecret(
		name: string,
		options: { timeoutMs?: number; pollMs?: number } = {},
	): Promise<string> {
		const { timeoutMs = 10000, pollMs = 200 } = options;
		const deadline = Date.now() + timeoutMs;

		while (Date.now() < deadline) {
			try {
				return await this.getSecret(name);
			} catch {
				// Secret doesn't exist yet, keep polling
			}
			await new Promise((resolve) => setTimeout(resolve, pollMs));
		}

		throw new Error(`Secret '${name}' not found within ${timeoutMs}ms`);
	}
}

/**
 * Helper for interacting with LocalStack AWS services in tests.
 *
 * Access individual services via properties:
 * - `localstack.secretsManager` - AWS Secrets Manager operations
 *
 * Future services can be added as needed (S3, SQS, etc.)
 */
export class LocalStackHelper {
	readonly secretsManager: SecretsManagerClient;

	constructor(endpoint: string) {
		this.secretsManager = new SecretsManagerClient(endpoint);
	}
}

export function createLocalStackHelper(ctx: HelperContext): LocalStackHelper {
	const result = ctx.serviceResults.localstack as LocalStackResult | undefined;
	if (!result) {
		throw new Error('LocalStack service not found in context');
	}
	return new LocalStackHelper(result.meta.endpoint);
}

declare module './types' {
	interface ServiceHelpers {
		localstack: LocalStackHelper;
	}
}
