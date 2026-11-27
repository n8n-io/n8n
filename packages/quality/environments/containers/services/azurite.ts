import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { randomBytes } from 'node:crypto';
import type { StartedNetwork } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import { createSilentLogConsumer } from '../helpers/utils';
import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult, StartContext } from './types';

const HOSTNAME = 'azurite';
const BLOB_PORT = 10000;
const DEFAULT_PROTOCOL = 'http' as const;
const DEFAULT_ACCOUNT_NAME = 'devstoreaccount1';
// Local emulator test key configured via AZURITE_ACCOUNTS (not a secret).
const DEFAULT_ACCOUNT_KEY = Buffer.from('test').toString('base64');
const MAX_CONTAINER_NAME_LENGTH = 63;
const CONTAINER_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const MAX_DELETE_CONCURRENCY = 20;

export type AzuriteProtocol = 'http' | 'https';

export interface AzuriteCredentials {
	accountName: string;
	accountKey: string;
}

export interface AzuriteMeta {
	endpoint: string;
	internalEndpoint: string;
	host: string;
	internalHost: string;
	protocol: AzuriteProtocol;
	accountName: string;
	accountKey: string;
	connectionString: string;
	internalConnectionString: string;
}

export type AzuriteResult = ServiceResult<AzuriteMeta>;

export interface AzuriteBlobConfig {
	endpoint: string;
	host: string;
	protocol: AzuriteProtocol;
	accountName: string;
	accountKey: string;
	connectionString: string;
}

export interface AzureBlobSummary {
	name: string;
	size: number;
	contentType?: string;
	eTag?: string;
	lastModified?: string;
}

export interface AzureBlobClientOptions {
	accountName?: string;
	accountKey?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isConnectionString(value: string): boolean {
	return /(?:^|;)\s*(?:AccountName|BlobEndpoint|DefaultEndpointsProtocol|UseDevelopmentStorage)=/i.test(
		value,
	);
}

/**
 * Return whether an Azure Blob SDK error indicates a missing container or blob.
 */
export function isAzureNotFound(error: unknown): boolean {
	if (!isRecord(error)) return false;
	const statusCode = typeof error.statusCode === 'number' ? error.statusCode : undefined;
	const code = typeof error.code === 'string' ? error.code : undefined;
	return (
		statusCode === 404 ||
		code === 'ContainerNotFound' ||
		code === 'BlobNotFound' ||
		code === 'ResourceNotFound'
	);
}

/**
 * Validate an Azure Blob container name against Azure Storage naming rules.
 */
export function validateBlobContainerName(containerName: string): void {
	if (!CONTAINER_NAME_PATTERN.test(containerName) || containerName.includes('--')) {
		throw new Error(
			`Invalid Azure Blob container name '${containerName}'. Use 3-63 lowercase letters, digits, or single hyphens; start and end with a letter or digit.`,
		);
	}
}

/**
 * Build a valid Azure Blob container name with a random suffix for isolation on reused containers.
 */
export function formatBlobContainerName(
	prefix = 'n8n-test',
	suffix = randomBytes(4).toString('hex'),
): string {
	const sanitizedSuffix = suffix
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.slice(0, 16);
	if (!sanitizedSuffix) {
		throw new Error('Container name suffix must include at least one letter or digit');
	}
	const maxPrefixLength = MAX_CONTAINER_NAME_LENGTH - sanitizedSuffix.length - 1;
	const sanitizedPrefix = prefix
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxPrefixLength)
		.replace(/-+$/, '');
	const base = sanitizedPrefix || 'container';
	const containerName = `${base}-${sanitizedSuffix}`;
	validateBlobContainerName(containerName);
	return containerName;
}

/**
 * Build a path-style Azurite Blob endpoint URL for a given host and storage account.
 */
export function buildAzuriteEndpoint(
	host: string,
	accountName = DEFAULT_ACCOUNT_NAME,
	protocol: AzuriteProtocol = DEFAULT_PROTOCOL,
): string {
	const normalizedHost = host
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\/+$/, '')
		.trim();
	if (!normalizedHost) {
		throw new Error('Azurite host must not be empty');
	}
	return `${protocol}://${normalizedHost}/${accountName}`;
}

/**
 * Build an Azure Storage connection string pointing at an Azurite Blob endpoint.
 */
export function buildAzuriteConnectionString(
	config: Pick<AzuriteBlobConfig, 'endpoint' | 'protocol' | 'accountName' | 'accountKey'>,
): string {
	const normalizedEndpoint = config.endpoint.replace(/\/+$/, '');
	return `DefaultEndpointsProtocol=${config.protocol};AccountName=${config.accountName};AccountKey=${config.accountKey};BlobEndpoint=${normalizedEndpoint};`;
}

/**
 * Build `N8N_EXTERNAL_STORAGE_AZURE_*` environment variables for n8n.
 */
export function buildN8nAzureBlobEnv(
	config: Pick<AzuriteBlobConfig, 'endpoint' | 'connectionString' | 'accountName' | 'accountKey'>,
	containerName?: string,
): Record<string, string> {
	const env: Record<string, string> = {
		N8N_EXTERNAL_STORAGE_AZURE_CONNECTION_STRING: config.connectionString,
		N8N_EXTERNAL_STORAGE_AZURE_ACCOUNT_NAME: config.accountName,
		N8N_EXTERNAL_STORAGE_AZURE_ACCOUNT_KEY: config.accountKey,
		N8N_EXTERNAL_STORAGE_AZURE_ENDPOINT: config.endpoint,
	};
	if (containerName !== undefined) {
		validateBlobContainerName(containerName);
		env.N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME = containerName;
	}
	return env;
}

export const azurite: Service<AzuriteResult> = {
	description: 'Azure Blob Storage emulator (Azurite)',

	async start(
		network: StartedNetwork,
		projectName: string,
		_options?: unknown,
		ctx?: StartContext,
	): Promise<AzuriteResult> {
		const { consumer, throwWithLogs } = createSilentLogConsumer();

		try {
			const container = await new GenericContainer(TEST_CONTAINER_IMAGES.azurite)
				.withNetwork(network)
				.withNetworkAliases(HOSTNAME)
				.withExposedPorts(BLOB_PORT)
				.withEnvironment({
					AZURITE_ACCOUNTS: `${DEFAULT_ACCOUNT_NAME}:${DEFAULT_ACCOUNT_KEY}`,
				})
				.withCommand([
					'azurite-blob',
					'--blobHost',
					'0.0.0.0',
					'--blobPort',
					String(BLOB_PORT),
					'--location',
					'/data',
					'--skipApiVersionCheck',
					'--silent',
				])
				.withWaitStrategy(
					Wait.forAll([
						Wait.forListeningPorts(),
						Wait.forLogMessage(/Azurite Blob service successfully listens on/i),
					]).withStartupTimeout(60_000),
				)
				.withLabels({
					'com.docker.compose.project': projectName,
					'com.docker.compose.service': HOSTNAME,
				})
				.withName(`${projectName}-${HOSTNAME}`)
				.withReuse()
				.withLogConsumer(consumer)
				.start();
			ctx?.registerContainer?.(container);

			const hostPort = container.getMappedPort(BLOB_PORT);
			const host = `${container.getHost()}:${hostPort}`;
			const internalHost = `${HOSTNAME}:${BLOB_PORT}`;
			const endpoint = buildAzuriteEndpoint(host, DEFAULT_ACCOUNT_NAME, DEFAULT_PROTOCOL);
			const internalEndpoint = buildAzuriteEndpoint(
				internalHost,
				DEFAULT_ACCOUNT_NAME,
				DEFAULT_PROTOCOL,
			);
			const connectionString = buildAzuriteConnectionString({
				protocol: DEFAULT_PROTOCOL,
				accountName: DEFAULT_ACCOUNT_NAME,
				accountKey: DEFAULT_ACCOUNT_KEY,
				endpoint,
			});
			const internalConnectionString = buildAzuriteConnectionString({
				protocol: DEFAULT_PROTOCOL,
				accountName: DEFAULT_ACCOUNT_NAME,
				accountKey: DEFAULT_ACCOUNT_KEY,
				endpoint: internalEndpoint,
			});

			const containerName = ctx?.config.env?.N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME;
			if (containerName) {
				await new AzureBlobClient(connectionString).createContainer(containerName);
			}

			return {
				container,
				meta: {
					endpoint,
					internalEndpoint,
					host,
					internalHost,
					protocol: DEFAULT_PROTOCOL,
					accountName: DEFAULT_ACCOUNT_NAME,
					accountKey: DEFAULT_ACCOUNT_KEY,
					connectionString,
					internalConnectionString,
				},
			};
		} catch (error) {
			return throwWithLogs(error);
		}
	},

	env(result: AzuriteResult, external?: boolean): Record<string, string> {
		const { meta } = result;
		return buildN8nAzureBlobEnv({
			endpoint: external ? meta.endpoint : meta.internalEndpoint,
			connectionString: external ? meta.connectionString : meta.internalConnectionString,
			accountName: meta.accountName,
			accountKey: meta.accountKey,
		});
	},
};

/**
 * Client for interacting with Azure Blob Storage via Azurite.
 * Uses the official `@azure/storage-blob` SDK.
 */
export class AzureBlobClient {
	private readonly client: BlobServiceClient;

	constructor(endpointOrConnectionString: string, options: AzureBlobClientOptions = {}) {
		if (isConnectionString(endpointOrConnectionString)) {
			this.client = BlobServiceClient.fromConnectionString(endpointOrConnectionString);
			return;
		}
		const accountName = options.accountName ?? DEFAULT_ACCOUNT_NAME;
		const accountKey = options.accountKey ?? DEFAULT_ACCOUNT_KEY;
		this.client = new BlobServiceClient(
			endpointOrConnectionString,
			new StorageSharedKeyCredential(accountName, accountKey),
		);
	}

	/** Create a blob container. Succeeds if the container already exists. */
	async createContainer(containerName: string): Promise<void> {
		validateBlobContainerName(containerName);
		await this.client.getContainerClient(containerName).createIfNotExists();
	}

	/** Create a blob container with a random suffix to isolate tests on reused Azurite containers. */
	async createUniqueContainer(prefix = 'n8n-test'): Promise<string> {
		const containerName = formatBlobContainerName(prefix);
		await this.createContainer(containerName);
		return containerName;
	}

	/** Return whether a blob container exists. */
	async containerExists(containerName: string): Promise<boolean> {
		validateBlobContainerName(containerName);
		return await this.client.getContainerClient(containerName).exists();
	}

	/** List all blob container names. */
	async listContainers(): Promise<string[]> {
		const names: string[] = [];
		for await (const container of this.client.listContainers()) {
			if (container.name) {
				names.push(container.name);
			}
		}
		return names;
	}

	/** Upload a blob to a container. */
	async uploadBlob(
		containerName: string,
		blobName: string,
		body: string | Buffer | Uint8Array,
		options: { contentType?: string; metadata?: Record<string, string> } = {},
	): Promise<void> {
		validateBlobContainerName(containerName);
		const payload =
			typeof body === 'string'
				? Buffer.from(body, 'utf8')
				: Buffer.isBuffer(body)
					? body
					: Buffer.from(body);
		await this.client
			.getContainerClient(containerName)
			.getBlockBlobClient(blobName)
			.uploadData(payload, {
				blobHTTPHeaders: options.contentType ? { blobContentType: options.contentType } : undefined,
				metadata: options.metadata,
			});
	}

	/** Download a blob as a Buffer. */
	async downloadBlob(containerName: string, blobName: string): Promise<Buffer> {
		validateBlobContainerName(containerName);
		return await this.client
			.getContainerClient(containerName)
			.getBlockBlobClient(blobName)
			.downloadToBuffer();
	}

	/** Download a blob decoded as UTF-8 text. */
	async downloadBlobText(containerName: string, blobName: string): Promise<string> {
		return (await this.downloadBlob(containerName, blobName)).toString('utf8');
	}

	/** Return whether a blob exists in a container. */
	async blobExists(containerName: string, blobName: string): Promise<boolean> {
		validateBlobContainerName(containerName);
		return await this.client
			.getContainerClient(containerName)
			.getBlockBlobClient(blobName)
			.exists();
	}

	/** List all blobs in a container across all pages. */
	async listBlobs(containerName: string, prefix?: string): Promise<AzureBlobSummary[]> {
		validateBlobContainerName(containerName);
		const blobs: AzureBlobSummary[] = [];
		const containerClient = this.client.getContainerClient(containerName);

		for await (const item of containerClient.listBlobsFlat(
			prefix !== undefined ? { prefix } : undefined,
		)) {
			blobs.push({
				name: item.name,
				size: item.properties.contentLength ?? 0,
				contentType: item.properties.contentType,
				eTag: item.properties.etag,
				lastModified: item.properties.lastModified?.toISOString(),
			});
		}

		return blobs;
	}

	/** Delete a single blob. Ignores missing blobs or containers during cleanup. */
	async deleteBlob(containerName: string, blobName: string): Promise<void> {
		validateBlobContainerName(containerName);
		try {
			await this.client
				.getContainerClient(containerName)
				.getBlockBlobClient(blobName)
				.deleteIfExists();
		} catch (error) {
			if (isAzureNotFound(error)) {
				return;
			}
			throw error;
		}
	}

	/** Delete blobs in bounded concurrent batches. Ignores missing blobs or containers. */
	async deleteBlobs(containerName: string, blobNames: string[]): Promise<void> {
		validateBlobContainerName(containerName);
		if (blobNames.length === 0) return;

		for (let i = 0; i < blobNames.length; i += MAX_DELETE_CONCURRENCY) {
			const batch = blobNames.slice(i, i + MAX_DELETE_CONCURRENCY);
			await Promise.all(
				batch.map(async (blobName) => await this.deleteBlob(containerName, blobName)),
			);
		}
	}

	/** Remove all blobs from a container. Ignores missing containers. */
	async emptyContainer(containerName: string): Promise<void> {
		validateBlobContainerName(containerName);
		try {
			const blobs = await this.listBlobs(containerName);
			await this.deleteBlobs(
				containerName,
				blobs.map((blob) => blob.name),
			);
		} catch (error) {
			if (isAzureNotFound(error)) {
				return;
			}
			throw error;
		}
	}

	/** Delete a blob container and all of its blobs. Ignores missing containers. */
	async deleteContainer(containerName: string): Promise<void> {
		validateBlobContainerName(containerName);
		await this.client.getContainerClient(containerName).deleteIfExists();
	}

	/** Delete all containers and their blobs. Prefer `deleteContainer` per test on reused containers. */
	async clear(): Promise<void> {
		const containers = await this.listContainers();
		await Promise.all(
			containers.map(async (containerName) => await this.deleteContainer(containerName)),
		);
	}
}

function resolveMeta(endpointOrMeta: string | AzuriteMeta): AzuriteMeta {
	if (typeof endpointOrMeta !== 'string') {
		return endpointOrMeta;
	}
	const parsed = new URL(endpointOrMeta);
	const protocol: AzuriteProtocol = parsed.protocol === 'https:' ? 'https' : 'http';
	const pathAccount = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
	const accountName = pathAccount || DEFAULT_ACCOUNT_NAME;
	const accountKey = DEFAULT_ACCOUNT_KEY;
	const host = parsed.host;
	const internalHost = `${HOSTNAME}:${BLOB_PORT}`;
	const endpoint = buildAzuriteEndpoint(host, accountName, protocol);
	const internalEndpoint = buildAzuriteEndpoint(internalHost, accountName, DEFAULT_PROTOCOL);
	return {
		endpoint,
		internalEndpoint,
		host,
		internalHost,
		protocol,
		accountName,
		accountKey,
		connectionString: buildAzuriteConnectionString({
			protocol,
			accountName,
			accountKey,
			endpoint,
		}),
		internalConnectionString: buildAzuriteConnectionString({
			protocol: DEFAULT_PROTOCOL,
			accountName,
			accountKey,
			endpoint: internalEndpoint,
		}),
	};
}

/**
 * Helper for interacting with Azurite Azure Blob Storage in tests.
 *
 * Access blob and container operations via `azurite.blob`.
 * Use `azurite.blobConfig`, `azurite.internalBlobConfig`, and
 * `azurite.getN8nAzureBlobEnv(containerName)` for host-side assertions and
 * container-side n8n configuration.
 */
export class AzuriteHelper {
	readonly blob: AzureBlobClient;
	readonly endpoint: string;
	readonly internalEndpoint: string;
	readonly host: string;
	readonly internalHost: string;
	readonly protocol: AzuriteProtocol;
	readonly accountName: string;
	readonly accountKey: string;
	readonly connectionString: string;
	readonly internalConnectionString: string;
	readonly credentials: Readonly<AzuriteCredentials>;

	constructor(endpointOrMeta: string | AzuriteMeta) {
		const meta = resolveMeta(endpointOrMeta);
		this.endpoint = meta.endpoint;
		this.internalEndpoint = meta.internalEndpoint;
		this.host = meta.host;
		this.internalHost = meta.internalHost;
		this.protocol = meta.protocol;
		this.accountName = meta.accountName;
		this.accountKey = meta.accountKey;
		this.connectionString = meta.connectionString;
		this.internalConnectionString = meta.internalConnectionString;
		this.credentials = Object.freeze({
			accountName: meta.accountName,
			accountKey: meta.accountKey,
		});
		this.blob = new AzureBlobClient(meta.connectionString);
	}

	/** Host-side Azure Blob configuration for test assertions and SDK clients. */
	get blobConfig(): AzuriteBlobConfig {
		return {
			endpoint: this.endpoint,
			host: this.host,
			protocol: this.protocol,
			accountName: this.accountName,
			accountKey: this.accountKey,
			connectionString: this.connectionString,
		};
	}

	/** Container-side Azure Blob configuration on the Docker network. */
	get internalBlobConfig(): AzuriteBlobConfig {
		return {
			endpoint: this.internalEndpoint,
			host: this.internalHost,
			protocol: this.internalEndpoint.startsWith('https://') ? 'https' : 'http',
			accountName: this.accountName,
			accountKey: this.accountKey,
			connectionString: this.internalConnectionString,
		};
	}

	/**
	 * Build `N8N_EXTERNAL_STORAGE_AZURE_*` environment variables for n8n.
	 * Uses the Docker-internal endpoint by default; pass `{ external: true }` for a host process.
	 */
	getN8nAzureBlobEnv(
		containerName: string,
		options: { external?: boolean } = {},
	): Record<string, string> {
		const config = options.external ? this.blobConfig : this.internalBlobConfig;
		return buildN8nAzureBlobEnv(config, containerName);
	}
}

export function createAzuriteHelper(ctx: HelperContext): AzuriteHelper {
	const result = ctx.serviceResults.azurite as AzuriteResult | undefined;
	if (!result) {
		throw new Error('Azurite service not found in context');
	}
	return new AzuriteHelper(result.meta);
}

declare module './types' {
	interface ServiceHelpers {
		azurite: AzuriteHelper;
	}
}
