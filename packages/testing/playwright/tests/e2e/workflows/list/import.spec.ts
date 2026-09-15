import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Import workflow',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.describe('From File', () => {
			test('should import workflow', async ({ n8n }) => {
				await n8n.navigate.toWorkflow('new');
				await n8n.page.waitForLoadState('load');

				await n8n.canvas.importWorkflow(
					'Test_workflow-actions_paste-data.json',
					'Import Test Workflow',
				);

				await n8n.page.waitForLoadState('load');

				await n8n.canvas.clickZoomToFitButton();

				await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);

				await expect(n8n.canvas.nodeConnections()).toHaveCount(5);
			});
		});
	},
);
