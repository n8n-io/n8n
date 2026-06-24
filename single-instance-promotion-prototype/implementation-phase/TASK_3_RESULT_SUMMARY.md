Task 3 is fully implemented and all typechecks pass. Here's what was built:

Backend:

Migration 1784000000039-CreateEnvironmentCredentialBinding.ts — environment_credential_binding table with FKs to project_environment and credentials_entity (CASCADE), unique index on (environmentId, sourceCredentialId)
Entity EnvironmentCredentialBinding + exports in entities/index.ts
Repository EnvironmentCredentialBindingRepository with resolveTargetCredentialId, findAllByEnvironment, replaceAll + export in repositories/index.ts; registered in both postgres and sqlite migration index files
DTO UpsertCredentialBindingsDto in packages/@n8n/api-types
Service — ProjectEnvironmentService extended with getCredentialBindings, replaceCredentialBindings (validates credentials belong to project), validateEnvironmentBindingsForPublish (checks all enabled-node credentials are bound)
WorkflowService — env-scoped publish path now calls validateEnvironmentBindingsForPublish and throws BadRequestError with missing credential names before writing the WPEV row
CredentialsHelper.getDecrypted — after loading the credential entity, checks additionalData.environmentId and swaps to the bound target credential if one exists
Controller — GET /:envId/credential-bindings + PUT /:envId/credential-bindings added to ProjectEnvironmentController
Frontend:

API module projectEnvironments.ts — getCredentialBindings + replaceCredentialBindings functions added
Store — credentialBindings: Record<envId, Binding[]> state + fetchCredentialBindings + saveCredentialBindings actions
EnvironmentBindings.vue — source→target credential select pairs (filtered to same type), save button
ProjectSettings.vue — "Configure" button per environment row toggles selectedEnvId; EnvironmentBindings shown below the list for the selected environment
WorkflowPublishModal.vue — fetches bindings on open, computes per-env binding completeness, shows ⚠ badge and disables publish button when credentials are unbound