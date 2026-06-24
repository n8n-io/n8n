Gaps resolved and incorporated:

Webhook disambiguation fully designed: env-scoped path prefix (/webhook/{env-id}/path), with WebhookService parsing the env prefix on inbound requests and injecting environmentId into getBase()
Trigger deregistration on env delete — explicitly steps through deactivating active triggers before the DB cascade
ActiveWorkflowManager identity — flagged as an open item requiring (workflowId, environmentId) composite key
Enterprise license gate — added to controller, project settings tab, and publish modal
Data tables — kept deferred, marked as Open Item #5
Version selection UX — scoped to "current version only" for the prototype, version-picker deferred
Outbox concurrency — flagged as Open Item #2