import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI workflow setup @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		// B1 — Build handoff smoke (AI-2392): the AI produces a workflow with a required
		// parameter left empty and the per-input issue indicator in the setup card does
		// not clear after the user fills the value in. Root cause: `workflowsStore.workflowObject`
		// holds a deep copy of the nodes (see `createWorkflowObject(..., copyData=true)`
		// in `workflows.store.ts`). `onParameterValueChanged` in `useSetupCardParameters`
		// only mutates the live Pinia node, so `ParameterInput`'s issue check — which
		// reads the node via `expressionLocalResolveCtx.workflow.getNode()` — keeps
		// seeing the stale (empty) parameters and keeps the red indicator on.
		test('should clear required-parameter issue indicator when the field is filled', async ({
			n8n,
		}) => {
			await n8n.navigate.toInstanceAi();

			// Ask for a workflow with an HTTP Request node whose required `url` is empty,
			// which produces a setup request with a parameter issue for `url`.
			await n8n.instanceAi.sendMessage(
				'Build a workflow with a manual trigger and an HTTP Request node. ' +
					'Leave the URL empty so I can fill it in afterwards. ' +
					'Open the setup after the workflow is built.',
			);

			await expect(n8n.instanceAi.getWorkflowSetupCard()).toBeVisible({ timeout: 120_000 });

			// The empty required `url` renders a visible issue indicator inside the card.
			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeVisible();

			// Fill the first (and only) visible parameter input with a valid value.
			await n8n.instanceAi.getWorkflowSetupParameterInput().fill('https://example.com');

			// After the fix, the issue indicator should unmount once the parameter is set.
			// Before the fix, it stays visible because the workflow object's deep-copied
			// node keeps returning the empty value to the issue checker.
			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeHidden({
				timeout: 5_000,
			});
		});
	},
);
