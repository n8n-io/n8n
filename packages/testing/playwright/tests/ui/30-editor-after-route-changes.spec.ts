import { test, expect } from '../../fixtures/base';

const NOTIFICATIONS = {
	WORKFLOW_CREATED: 'Workflow successfully created',
};

test.describe('Editor zoom should work after route changes', () => {
	test.beforeEach(async ({ n8n, api }) => {
		await api.enableFeature('debugInEditor');
		await api.enableFeature('workflowHistory');

		await n8n.workflowComposer.createWorkflowFromJsonFile(
			'Lots_of_nodes.json',
			'Lots of nodes test',
		);
		await n8n.notifications.waitForNotificationAndClose(NOTIFICATIONS.WORKFLOW_CREATED);
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
