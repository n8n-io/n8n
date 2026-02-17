import { test, expect } from '../../../../fixtures/base';

test.describe('Editor zoom should work after route changes', {
	annotation: [
		{ type: 'owner', description: 'Adore' },
	],
}, () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.api.enableFeature('debugInEditor');
		await n8n.api.enableFeature('workflowHistory');

		await n8n.workflowComposer.createWorkflowFromJsonFile(
			'Lots_of_nodes.json',
			'Lots of nodes test',
		);
	});

	test('should maintain zoom functionality after switching between Editor and Workflow history and Workflow list', async ({
		n8n,
	}) => {
		const initialNodeCount = await n8n.canvas.getCanvasNodes().count();
		expect(initialNodeCount).toBeGreaterThan(0);

		await n8n.canvasComposer.switchBetweenEditorAndHistory();
		await n8n.canvasComposer.zoomInAndCheckNodes();

		await n8n.canvasComposer.switchBetweenEditorAndHistory();
		await n8n.canvasComposer.switchBetweenEditorAndHistory();
		await n8n.canvasComposer.zoomInAndCheckNodes();

		await n8n.canvasComposer.switchBetweenEditorAndWorkflowList();
		await n8n.canvasComposer.zoomInAndCheckNodes();

		await n8n.canvasComposer.switchBetweenEditorAndWorkflowList();
		await n8n.canvasComposer.switchBetweenEditorAndWorkflowList();
		await n8n.canvasComposer.zoomInAndCheckNodes();

		await n8n.canvasComposer.switchBetweenEditorAndHistory();
		await n8n.canvasComposer.switchBetweenEditorAndWorkflowList();
	});
});
