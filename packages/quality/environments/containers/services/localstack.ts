import {
	BucketLocationConstraint,
	CreateBucketCommand,
	DeleteBucketCommand,
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	ListBucketsCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client as AwsS3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3';
import {
	CreateSecretCommand,
	DeleteSecretCommand,
	GetSecretValueCommand,
	ListSecretsCommand,
	SecretsManagerClient as AwsSecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { randomBytes } from 'node:crypto';
import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'localstack';
const EDGE_PORT = 4566;
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_ACCESS_KEY_ID = 'test';
const DEFAULT_SECRET_ACCESS_KEY = 'test';
const ENABLED_SERVICES = ['secretsmanager', 's3'] as const;
const READY_SERVICE_STATES = new Set(['available', 'running']);
const MAX_DELETE_OBJECTS_BATCH = 1000;
const MAX_BUCKET_NAME_LENGTH = 63;
const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

export type LocalStackProtocol = 'http' | 'https';

export interface LocalStackCredentials {
	accessKeyId: string;
	secretAccessKey: string;
}

export interface LocalStackMeta {
	endpoint: string;
	internalEndpoint: string;
	host: string;
	internalHost: string;
	protocol: LocalStackProtocol;
	region: string;
	credentials: LocalStackCredentials;
}

export type LocalStackResult = ServiceResult<LocalStackMeta>;

export interface LocalStackS3Config {
	endpoint: string;
	host: string;
	protocol: LocalStackProtocol;
	region: string;
	forcePathStyle: true;
	credentials: LocalStackCredentials;
}

export interface S3ObjectSummary {
	key: string;
	size: number;
	eTag?: string;
	lastModified?: string;
}

export interface S3ClientOptions {
	region?: string;
	credentials?: LocalStackCredentials;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isBucketLocationConstraint(region: string): region is BucketLocationConstraint {
	return Object.values(BucketLocationConstraint).some((value) => value === region);
}

function isS3NotFound(error: unknown): boolean {
	if (error instanceof S3ServiceException) {
		return (
			error.$metadata.httpStatusCode === 404 ||
			error.name === 'NotFound' ||
			error.name === 'NoSuchBucket' ||
			error.name === 'NoSuchKey'
		);
	}
	return (
		error instanceof Error &&
		(error.name === 'NotFound' || error.name === 'NoSuchBucket' || error.name === 'NoSuchKey')
	);
}

/**
 * Check whether all enabled LocalStack services are ready from `/_localstack/health`.
 * LocalStack reports `available` before the first call and `running` after activation
 * (for example on a reused container).
 */
export function isLocalStackHealthy(body: string): boolean {
	try {
		const parsed: unknown = JSON.parse(body);
		if (!isRecord(parsed) || !isRecord(parsed.services)) {
			return false;
		}
		const { services } = parsed;
		return ENABLED_SERVICES.every((service) => {
			const status = services[service];
			return typeof status === 'string' && READY_SERVICE_STATES.has(status);
		});
	} catch {
		return false;
	}
}

export function validateBucketName(bucket: string): void {
	if (!BUCKET_NAME_PATTERN.test(bucket) || bucket.includes('..') || IPV4_PATTERN.test(bucket)) {
		throw new Error(
			`Invalid S3 bucket name '${bucket}'. Use 3-63 lowercase letters, digits, hyphens, or dots; start and end with a letter or digit; omit consecutive dots and IPv4 addresses.`,
		);
	}
}

/**
 * Build a valid S3 bucket name with a random suffix for isolation on reused containers.
 */
export function formatBucketName(
	prefix = 'n8n-test',
	suffix = randomBytes(4).toString('hex'),
): string {
	const sanitizedSuffix = suffix
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.slice(0, 16);
	if (!sanitizedSuffix) {
		throw new Error('Bucket name suffix must include at least one letter or digit');
	}
	const maxPrefixLength = MAX_BUCKET_NAME_LENGTH - sanitizedSuffix.length - 1;
	const sanitizedPrefix = prefix
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxPrefixLength)
		.replace(/-+$/, '');
	const base = sanitizedPrefix || 'bucket';
	const bucket = `${base}-${sanitizedSuffix}`;
	validateBucketName(bucket);
	return bucket;
}

export function buildN8nS3Env(
	config: Pick<LocalStackS3Config, 'host' | 'protocol' | 'region' | 'credentials'>,
	bucketName?: string,
): Record<string, string> {
	const env: Record<string, string> = {
		N8N_EXTERNAL_STORAGE_S3_HOST: config.host,
		N8N_EXTERNAL_STORAGE_S3_PROTOCOL: config.protocol,
		N8N_EXTERNAL_STORAGE_S3_BUCKET_REGION: config.region,
		N8N_EXTERNAL_STORAGE_S3_ACCESS_KEY: config.credentials.accessKeyId,
		N8N_EXTERNAL_STORAGE_S3_ACCESS_SECRET: config.credentials.secretAccessKey,
		N8N_EXTERNAL_STORAGE_S3_FORCE_PATH_STYLE: 'true',
	};
	if (bucketName !== undefined) {
		validateBucketName(bucketName);
		env.N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME = bucketName;
	}
	return env;
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
					SERVICES: ENABLED_SERVICES.join(','),
					DEFAULT_REGION,
					// Disable LocalStack Pro features we don't need
					SKIP_SSL_CERT_DOWNLOAD: '1',
				})
				.withWaitStrategy(
					Wait.forAll([
						Wait.forListeningPorts(),
						Wait.forHttp('/_localstack/health', EDGE_PORT)
							.forStatusCode(200)
							.forResponsePredicate(isLocalStackHealthy)
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
			const host = `${container.getHost()}:${hostPort}`;
			const internalHost = `${HOSTNAME}:${EDGE_PORT}`;

			return {
				container,
				meta: {
					endpoint: `http://${host}`,
					internalEndpoint: `http://${internalHost}`,
					host,
					internalHost,
					protocol: 'http',
					region: DEFAULT_REGION,
					credentials: {
						accessKeyId: DEFAULT_ACCESS_KEY_ID,
						secretAccessKey: DEFAULT_SECRET_ACCESS_KEY,
					},
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(result: LocalStackResult, external?: boolean): Record<string, string> {
		const { meta } = result;
		return {
			AWS_ENDPOINT_URL: external ? meta.endpoint : meta.internalEndpoint,
			AWS_ACCESS_KEY_ID: meta.credentials.accessKeyId,
			AWS_SECRET_ACCESS_KEY: meta.credentials.secretAccessKey,
			AWS_DEFAULT_REGION: meta.region,
			...buildN8nS3Env({
				host: external ? meta.host : meta.internalHost,
				protocol: meta.protocol,
				region: meta.region,
				credentials: meta.credentials,
			}),
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
				accessKeyId: DEFAULT_ACCESS_KEY_ID,
				secretAccessKey: DEFAULT_SECRET_ACCESS_KEY,
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
 * Client for interacting with AWS S3 via LocalStack.
 * Uses the official AWS SDK with path-style addressing for LocalStack compatibility.
 */
export class S3Client {
	private readonly client: AwsS3Client;
	private readonly region: string;

	constructor(endpoint: string, options: S3ClientOptions = {}) {
		this.region = options.region ?? DEFAULT_REGION;
		this.client = new AwsS3Client({
			endpoint,
			region: this.region,
			forcePathStyle: true,
			credentials: options.credentials ?? {
				accessKeyId: DEFAULT_ACCESS_KEY_ID,
				secretAccessKey: DEFAULT_SECRET_ACCESS_KEY,
			},
		});
	}

	/** Create a bucket. Succeeds if the account already owns the bucket. */
	async createBucket(bucket: string): Promise<void> {
		validateBucketName(bucket);
		try {
			await this.client.send(
				new CreateBucketCommand({
					Bucket: bucket,
					CreateBucketConfiguration: isBucketLocationConstraint(this.region)
						? { LocationConstraint: this.region }
						: undefined,
				}),
			);
		} catch (error) {
			if (error instanceof Error && error.name === 'BucketAlreadyOwnedByYou') {
				return;
			}
			throw error;
		}
	}

	/** Create a bucket with a random suffix to isolate tests on reused containers. */
	async createUniqueBucket(prefix = 'n8n-test'): Promise<string> {
		const bucket = formatBucketName(prefix);
		await this.createBucket(bucket);
		return bucket;
	}

	/** Return whether a bucket exists. */
	async bucketExists(bucket: string): Promise<boolean> {
		validateBucketName(bucket);
		try {
			await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
			return true;
		} catch (error) {
			if (isS3NotFound(error)) {
				return false;
			}
			throw error;
		}
	}

	/** List all bucket names. */
	async listBuckets(): Promise<string[]> {
		const response = await this.client.send(new ListBucketsCommand({}));
		return (response.Buckets ?? [])
			.map((bucket) => bucket.Name)
			.filter((name): name is string => Boolean(name));
	}

	/** Upload an object to a bucket. */
	async putObject(
		bucket: string,
		key: string,
		body: string | Buffer | Uint8Array,
		options: { contentType?: string } = {},
	): Promise<void> {
		validateBucketName(bucket);
		await this.client.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: body,
				ContentType: options.contentType,
			}),
		);
	}

	/** Download an object as a Buffer. */
	async getObject(bucket: string, key: string): Promise<Buffer> {
		validateBucketName(bucket);
		const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
		if (!response.Body) {
			throw new Error(`Object '${key}' in bucket '${bucket}' has no body`);
		}
		return Buffer.from(await response.Body.transformToByteArray());
	}

	/** Download an object decoded as UTF-8 text. */
	async getObjectText(bucket: string, key: string): Promise<string> {
		return (await this.getObject(bucket, key)).toString('utf8');
	}

	/** Return whether an object exists in a bucket. */
	async objectExists(bucket: string, key: string): Promise<boolean> {
		validateBucketName(bucket);
		try {
			await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
			return true;
		} catch (error) {
			if (isS3NotFound(error)) {
				return false;
			}
			throw error;
		}
	}

	/** List all objects in a bucket across all ListObjectsV2 pages. */
	async listObjects(bucket: string, prefix?: string): Promise<S3ObjectSummary[]> {
		validateBucketName(bucket);
		const objects: S3ObjectSummary[] = [];
		let continuationToken: string | undefined;

		do {
			const response = await this.client.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: prefix,
					ContinuationToken: continuationToken,
				}),
			);

			for (const item of response.Contents ?? []) {
				if (!item.Key) continue;
				objects.push({
					key: item.Key,
					size: item.Size ?? 0,
					eTag: item.ETag,
					lastModified: item.LastModified?.toISOString(),
				});
			}

			continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
		} while (continuationToken);

		return objects;
	}

	/** Delete a single object. Ignores missing keys or buckets during cleanup. */
	async deleteObject(bucket: string, key: string): Promise<void> {
		validateBucketName(bucket);
		try {
			await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
		} catch (error) {
			if (isS3NotFound(error)) {
				return;
			}
			throw error;
		}
	}

	/** Delete objects by key in batches of up to 1000 keys (the S3 DeleteObjects limit). */
	async deleteObjects(bucket: string, keys: string[]): Promise<void> {
		validateBucketName(bucket);
		if (keys.length === 0) return;

		for (let i = 0; i < keys.length; i += MAX_DELETE_OBJECTS_BATCH) {
			const batch = keys.slice(i, i + MAX_DELETE_OBJECTS_BATCH);
			const { Errors: errors } = await this.client.send(
				new DeleteObjectsCommand({
					Bucket: bucket,
					Delete: {
						Objects: batch.map((key) => ({ Key: key })),
						Quiet: true,
					},
				}),
			);

			if (errors && errors.length > 0) {
				const summary = errors
					.slice(0, 5)
					.map((failure) => {
						const key = failure.Key ?? '<unknown>';
						const code = failure.Code ?? 'Unknown';
						const message = failure.Message ?? '';
						return `${key} (${code}${message ? `: ${message}` : ''})`;
					})
					.join(', ');
				throw new Error(
					`Failed to delete ${errors.length} of ${batch.length} objects from '${bucket}': ${summary}`,
				);
			}
		}
	}

	/** Remove all objects from a bucket. Ignores missing buckets. */
	async emptyBucket(bucket: string): Promise<void> {
		validateBucketName(bucket);
		try {
			const objects = await this.listObjects(bucket);
			await this.deleteObjects(
				bucket,
				objects.map((object) => object.key),
			);
		} catch (error) {
			if (isS3NotFound(error)) {
				return;
			}
			throw error;
		}
	}

	/** Delete a bucket. Empties the bucket first by default and ignores missing buckets. */
	async deleteBucket(bucket: string, options: { force?: boolean } = {}): Promise<void> {
		validateBucketName(bucket);
		const { force = true } = options;
		if (force) {
			await this.emptyBucket(bucket);
		}
		try {
			await this.client.send(new DeleteBucketCommand({ Bucket: bucket }));
		} catch (error) {
			if (isS3NotFound(error)) {
				return;
			}
			throw error;
		}
	}

	/** Delete all buckets and their objects. Prefer `deleteBucket` per test on reused containers. */
	async clear(): Promise<void> {
		const buckets = await this.listBuckets();
		await Promise.all(buckets.map(async (bucket) => await this.deleteBucket(bucket)));
	}
}

function resolveMeta(endpointOrMeta: string | LocalStackMeta): LocalStackMeta {
	if (typeof endpointOrMeta !== 'string') {
		return endpointOrMeta;
	}
	const endpoint = endpointOrMeta.replace(/\/+$/, '');
	const parsed = new URL(endpoint);
	const protocol: LocalStackProtocol = parsed.protocol === 'https:' ? 'https' : 'http';
	const internalHost = `${HOSTNAME}:${EDGE_PORT}`;
	return {
		endpoint,
		internalEndpoint: `http://${internalHost}`,
		host: parsed.host,
		internalHost,
		protocol,
		region: DEFAULT_REGION,
		credentials: {
			accessKeyId: DEFAULT_ACCESS_KEY_ID,
			secretAccessKey: DEFAULT_SECRET_ACCESS_KEY,
		},
	};
}

/**
 * Helper for interacting with LocalStack AWS services in tests.
 *
 * Access individual services via properties:
 * - `localstack.secretsManager` - AWS Secrets Manager operations
 * - `localstack.s3` - S3 bucket and object operations
 *
 * Use `localstack.s3Config`, `localstack.internalS3Config`, and `localstack.getN8nS3Env(bucket)`
 * for host-side assertions and container-side n8n configuration.
 */
export class LocalStackHelper {
	readonly secretsManager: SecretsManagerClient;
	readonly s3: S3Client;
	readonly endpoint: string;
	readonly internalEndpoint: string;
	readonly host: string;
	readonly internalHost: string;
	readonly protocol: LocalStackProtocol;
	readonly region: string;
	readonly credentials: Readonly<LocalStackCredentials>;

	constructor(endpointOrMeta: string | LocalStackMeta) {
		const meta = resolveMeta(endpointOrMeta);
		this.endpoint = meta.endpoint;
		this.internalEndpoint = meta.internalEndpoint;
		this.host = meta.host;
		this.internalHost = meta.internalHost;
		this.protocol = meta.protocol;
		this.region = meta.region;
		this.credentials = Object.freeze({ ...meta.credentials });
		this.secretsManager = new SecretsManagerClient(meta.endpoint);
		this.s3 = new S3Client(meta.endpoint, {
			region: meta.region,
			credentials: meta.credentials,
		});
	}

	/** Host-side S3 endpoint and credentials for test assertions and SDK clients. */
	get s3Config(): LocalStackS3Config {
		return {
			endpoint: this.endpoint,
			host: this.host,
			protocol: this.protocol,
			region: this.region,
			forcePathStyle: true,
			credentials: { ...this.credentials },
		};
	}

	/** Container-side S3 endpoint and credentials on the Docker network. */
	get internalS3Config(): LocalStackS3Config {
		return {
			endpoint: this.internalEndpoint,
			host: this.internalHost,
			protocol: this.internalEndpoint.startsWith('https://') ? 'https' : 'http',
			region: this.region,
			forcePathStyle: true,
			credentials: { ...this.credentials },
		};
	}

	/**
	 * Build `N8N_EXTERNAL_STORAGE_S3_*` environment variables for n8n.
	 * Uses the Docker-internal endpoint by default; pass `{ external: true }` for a host process.
	 */
	getN8nS3Env(bucketName: string, options: { external?: boolean } = {}): Record<string, string> {
		const config = options.external ? this.s3Config : this.internalS3Config;
		return buildN8nS3Env(config, bucketName);
	}
}

export function createLocalStackHelper(ctx: HelperContext): LocalStackHelper {
	const result = ctx.serviceResults.localstack as LocalStackResult | undefined;
	if (!result) {
		throw new Error('LocalStack service not found in context');
	}
	return new LocalStackHelper(result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		localstack: LocalStackHelper;
	}
}
