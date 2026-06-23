Here's a summary of what's new vs. the original plan:

Two new DB tables and resource types:

environment_variable_override — stores per-environment value overrides for project variables. Uses a value-override approach (not variable-swap) so $vars.API_URL keeps the same key everywhere; only the resolved value changes per env.
environment_data_table_binding — maps a source table to an env-specific target table at execution time, exactly mirroring the credential binding pattern. The entity stores IDs as plain columns to avoid a cross-package TypeORM dependency (DataTable entity lives in packages/cli, not @n8n/db).
Key injection points:

Variables: WorkflowHelpers.getVariables() gains an optional environmentId param; overrides are merged by key before the variables object is frozen.
Data tables: The dataTableProxyProvider (injected into additionalData['data-table']) is wrapped to remap table IDs via resolveTargetDataTableId() before forwarding.
Publication model clarification:

Environments are opt-in per workflow, not mandatory per project. Even when a project has environments, a workflow can be published "globally" via the existing path — no binding validation, no env context.
The publish modal always shows a "Publish globally" option alongside the per-environment slots.
A workflow can hold both a global publication and per-environment publications simultaneously as independent trigger slots.