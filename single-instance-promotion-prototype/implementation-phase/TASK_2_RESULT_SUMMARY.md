Task 2 is fully implemented and all typechecks pass across every touched package. Here's a summary of what was built:

Backend

New workflow_published_environment_version table (migration + entity + repository) tracking which versionId is "live" per (workflowId, environmentId) pair, with CASCADE FKs on workflow/environment and RESTRICT on the history version
environmentId threaded through IWorkflowExecuteAdditionalData, IWorkflowExecutionDataProcess, ActivateWorkflowDto, getBase(), workflow-runner.ts, workflow-execution.service.ts, and workflows.controller.ts
WorkflowService.activateWorkflow() has an early-return path: if environmentId is present, it calls workflowPublishedEnvVersionRepository.setPublishedVersion() and returns without touching webhooks or ActiveWorkflowManager
New GET /:workflowId/published-env-versions endpoint returns Record<envId, publishedVersionId>
Frontend

IStartRunData gains environmentId?; runWorkflow() appends ?environmentId=xxx to the POST URL when set
EnvironmentSelector.vue — a <select> dropdown on the canvas that sets selectedEnvironmentId in the environments store; useRunWorkflow picks it up automatically
WorkflowPublishModal shows per-environment publish slots with freshness indicators (green = current version, yellow = stale, grey = never published)
REST API client has publishToEnvironment() and getPublishedEnvVersions() helpers