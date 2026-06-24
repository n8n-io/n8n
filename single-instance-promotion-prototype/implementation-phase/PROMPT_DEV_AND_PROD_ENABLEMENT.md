The EnvironmentList component used in packages/frontend/editor-ui/src/features/collaboration/projects/views/ProjectSettings.vue is the place where users can specify which environments exist for workflows in this project.
Environments enable one workflow to have different credentials defined per node of a workflow per environment.

Now we want to make it easy for users to start using environments.
Rather than the empty state of the EnvironmentList component being an inline form that allows you to add an environment on the fly, let's make it a toggle button (from the design-system components), with the label "Enable environments".
As long as no environments are defined in the project, that toggle is off.
When a user tries to enable it, a confirmation dialog pops up that explains to the user that this will add two environments to the project: "Dev" and "Prod", and that all credentials of all nodes in existing credentials will automatically be bound for both of these environments (both environments use the same credential).
This way the workflows behave the same as before, but workflow authors can start choosing a different credential per node per environment going forward.
While there are environments defined for a project, list them (with ghost style edit and delete buttons next to them).
And below that list display a ghost style "+ add environment" button, which will then display the inline form as before with "cancel" and "create" buttons.

Plan this change.
Both the frontend and the backend parts.
Ask follow-up questions where needed