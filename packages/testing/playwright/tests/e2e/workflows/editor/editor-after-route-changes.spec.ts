import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Editor zoom should work after route changes',
	{ annotation: [{ type: 'owner', description: 'Adore' }] },
	() => {
		// Heavy workflow + repeated canvas re-renders push a combined test past the
		// 60s default; give each route-type its own budget and extra headroom.
		test.slow();

		test.beforeEach(async ({ n8n }) => {
			await n8n.api.enableFeature('debugInEditor');
			await n8n.api.enableFeature('workflowHistory');
			await n8n.start.fromImportedWorkflow('Lots_of_nodes.json');
		});

		test('should maintain zoom functionality after switching between Editor and Workflow history', async ({
			n8n,
		}) => {
			await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible();
			expect(await n8n.canvas.getCanvasNodes().count()).toBeGreaterThan(0);

			await n8n.canvasComposer.switchBetweenEditorAndHistory();
			await n8n.canvasComposer.zoomInAndCheckNodes();

			await n8n.canvasComposer.switchBetweenEditorAndHistory();
			await n8n.canvasComposer.switchBetweenEditorAndHistory();
			await n8n.canvasComposer.zoomInAndCheckNodes();
		});

		test('should maintain zoom functionality after switching between Editor and Workflow list', async ({
			n8n,
		}) => {
			await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible();
			expect(await n8n.canvas.getCanvasNodes().count()).toBeGreaterThan(0);

			await n8n.canvasComposer.switchBetweenEditorAndWorkflowList();
			await n8n.canvasComposer.zoomInAndCheckNodes();

			await n8n.canvasComposer.switchBetweenEditorAndWorkflowList();
			await n8n.canvasComposer.switchBetweenEditorAndWorkflowList();
			await n8n.canvasComposer.zoomInAndCheckNodes();
		});
	},
);
