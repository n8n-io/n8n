/**
 * n8n Test Containers
 *
 * This package provides container management utilities for n8n testing.
 * Services are accessed via n8nContainer.services.* in tests.
 */

// Stack orchestration - primary public API
export { createN8NStack } from './stack';
export type { N8NConfig, N8NStack } from './stack';

export { consumeStartupFailure } from './startup-diagnostics';
export type { N8NStartupDiagnostics } from './services/n8n';

// K3s + Helm chart stack - for Kubernetes deployment validation
export { createHelmStack } from './helm-stack';
export type { HelmStack, HelmStackConfig } from './helm-stack';

// Service-only stack (no n8n containers) - for integration tests
export {
	createServiceStack,
	collectExternalEnv,
	devEnvFilePath,
	writeDevEnvFile,
} from './service-stack';

export type { StackTelemetryRecord } from './telemetry';

// Performance plans (CLI-only)
export * from './performance-plans';

// Types used externally by tests
export { type LogEntry, type MetricsHelper } from './services/observability';
export { type GiteaHelper } from './services/gitea';
export { KafkaHelper } from './services/kafka';
export {
	LocalStackHelper,
	S3Client,
	type LocalStackCredentials,
	type LocalStackS3Config,
	type S3ObjectSummary,
} from './services/localstack';
export {
	AzuriteHelper,
	AzureBlobClient,
	buildAzuriteConnectionString,
	buildAzuriteEndpoint,
	buildN8nAzureBlobEnv,
	formatBlobContainerName,
	isAzureNotFound,
	validateBlobContainerName,
	type AzuriteBlobConfig,
	type AzuriteCredentials,
	type AzuriteMeta,
	type AzuriteProtocol,
	type AzuriteResult,
	type AzureBlobClientOptions,
	type AzureBlobSummary,
} from './services/azurite';
export {
	RedisClusterHelper,
	isClusterInfoHealthy,
	isClusterTopologyComplete,
	type RedisClusterInfo,
	type RedisClusterMeta,
	type RedisClusterNode,
	type RedisClusterResult,
	type RedisClusterSlotRange,
	type RedisClusterSlotRoutingResult,
	type RedisMovedRedirect,
} from './services/redis-cluster';
