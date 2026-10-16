import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Editor zoom should work after route changes',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should maintain zoom functionality after switching between Editor and Workflow history and Workflow list', async ({
			n8n,
		}) => {
			// ~10 full canvas reloads of a large workflow. Under CI load each reload can take
			// 5-15s, so the default 60s budget times out at whichever step is running.
			test.setTimeout(180_000);

			await n8n.api.enableFeature('debugInEditor');
			await n8n.api.enableFeature('workflowHistory');
			const { createdWorkflow } = await n8n.start.fromImportedWorkflow('Lots_of_nodes.json');
			const workflowName = createdWorkflow.name;

			await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible();
			const initialNodeCount = await n8n.canvas.getCanvasNodes().count();
			expect(initialNodeCount).toBeGreaterThan(0);

			await n8n.canvasComposer.switchBetweenEditorAndHistory();
			await n8n.canvasComposer.zoomInAndCheckNodes();

			await n8n.canvasComposer.switchBetweenEditorAndHistory();
			await n8n.canvasComposer.switchBetweenEditorAndHistory();
			await n8n.canvasComposer.zoomInAndCheckNodes();

			await n8n.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
			await n8n.canvasComposer.zoomInAndCheckNodes();

			await n8n.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
			await n8n.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
			await n8n.canvasComposer.zoomInAndCheckNodes();

			await n8n.canvasComposer.switchBetweenEditorAndHistory();
			await n8n.canvasComposer.switchBetweenEditorAndWorkflowList(workflowName);
		});
	},
);
