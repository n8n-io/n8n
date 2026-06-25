Based on single-instance-promotion-prototype/implementation-phase/PLAN_SWITCH_TO_NODEID_CRED_DISCRIMINATOR.md and potentially other adjacent files in the implementation-phase directory that help you understand the problem:
Come up with a plan to implement an "EnvironmentSelect" inside NodeCredentials.
I imagine it will be a dropdown at the top of the component, that will only be shown if the project that the workflow is currently in has environments defined. It has one value for all environments that exist in the project.
Its initial value should be the environmentsStore.selectedEnvironmentId.
If there exists a credential binding (packages/@n8n/db/src/entities/environment-credential-binding.ts) for the currently viewed node in the selected environment, show that credential data, if not, show the regular empty state of NodeCredentials.vue. Filling out this empty state should create a credentialbinding for this node for the selected environment.

This may require backend changes as well.

Ask follow-up questions where needed.