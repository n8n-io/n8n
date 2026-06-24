Actually the "workflow_published_version" table is not used unless the env var N8N_USE_WORKFLOW_PUBLICATION_SERVICE from packages/@n8n/config/src/configs/workflows.config.ts is set to true, which we are not doing yet.

Find out what the currently used publishing implementation looks like and adjust this plan to fit into that setup.

----

Please answer in the plan how the activeVersionId from the WorkflowEntity is supposed to keep existing in a world of multi-env published workflows


----


now let's change the table name of workflow_environment_publication to workflow_published_environment_version