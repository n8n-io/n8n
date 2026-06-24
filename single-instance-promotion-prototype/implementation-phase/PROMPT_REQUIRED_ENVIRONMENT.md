The recent commit with ID 07fbdcc234b5eee8532d4789bbd56d13b68f4ffd added support to publish a workflow per environment, where the existing environments are defined per project (which contains workflows).

In that implementation, it is possible to still have a "non environment" published version.
That is also why the packages/frontend/editor-ui/src/features/environments/components/EnvironmentSelector.vue has the "Global (no environment)" value.

Now there is a new definition for requirements for workflows that belong to projects that use an environments:
When a project has environments defined, each workflow in that project can only be published in the scope of one of those environments.
The concept of the "old published state without environment", which is called "Global" in the EnvironmentSelector, will only work in projects that have no environments defined.

When rendering workflow of a project that has no environments defined, the ENvironmentSelector shouldn't even be shown.

Read the changes of commit 07fbdcc234b5eee8532d4789bbd56d13b68f4ffd and come up with a plan to match the new requirements I just described