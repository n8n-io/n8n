All done. Here's a summary of every change made:

DB layer

migration: Added workflowId column + FK → workflow_entity, replaced unique index (environmentId, sourceCredentialId) with (workflowId, environmentId, sourceCredentialId), updated lookup index to (workflowId, environmentId)
entity: Added workflowId column and workflow ManyToOne relation
repository: All three methods (resolveTargetCredentialId, findAllByEnvironment, replaceAll) now accept and filter by workflowId
Backend

project-environment.service.ts: workflowId added to getCredentialBindings, replaceCredentialBindings, validateEnvironmentBindingsForPublish
project-environment.controller.ts: Both credential-binding endpoints extract workflowId from req.query and throw BadRequestError if absent
credentials-helper.ts: Execution-time swap now gates on additionalData.workflowId too and passes it to resolveTargetCredentialId
workflow.service.ts: Publish-time validation passes workflowId to validateEnvironmentBindingsForPublish
Frontend

projectEnvironments.ts: workflowId added to both binding API functions; EnvironmentCredentialBinding interface updated
environments.store.ts: State is now Record<workflowId, Record<envId, bindings[]>>; fetchCredentialBindings/saveCredentialBindings accept workflowId; deleteEnvironment cleans up nested structure
WorkflowPublishModal.vue: Updated fetch call and binding lookup to use [workflowId][envId] shape
EnvironmentBindings.vue: Deleted
ProjectSettings.vue: Import and usage of EnvironmentBindings removed
en.json: All projects.settings.environments.bindings.* keys removed