Here's a summary of all the changes made:

@n8n/db:

New migration 1784000000040-AddEnvironmentIdToWebhookEntity.ts — adds nullable environmentId varchar(36) column to webhook_entity
Registered in both postgresdb/index.ts and sqlite/index.ts
WebhookEntity — added environmentId?: string column (nullable, used to distinguish env-specific webhooks from global ones)
packages/cli/src/active-workflow-manager.ts:

addWebhooks() accepts a new optional environmentId? param; when set, assigns it to the created WebhookEntity
addWebhooksForEnvironmentVersions() now passes environmentId when calling addWebhooks()
packages/cli/src/webhooks/live-webhooks.ts:

Constructor now injects WorkflowHistoryRepository and WorkflowPublishedEnvironmentVersionRepository
New private loadEnvVersionExecutionData(workflowId, environmentId) — loads the env-specific WorkflowHistory snapshot and returns the env slug
executeWebhook() — branches on webhook.environmentId: if set, uses the env snapshot and strips the env prefix from webhookPath before matching the webhook node; also marks the workflow active: true for env-published webhooks that have no global activeVersionId
findAccessControlOptions() — same env-aware branching for CORS option lookup
Test files: Updated WebhookEntity mocks to explicitly set environmentId: undefined (required because jest-mock-extended returns truthy proxies for unspecified properties).