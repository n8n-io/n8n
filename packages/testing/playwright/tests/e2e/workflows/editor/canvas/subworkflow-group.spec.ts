import { test, expect } from '../../../../../fixtures/base';
import type { TestRequirements } from '../../../../../Types';

const FIXTURE = 'subworkflow-group.json';

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '083_canvas_nodes_grouping': true }),
	},
};

test.describe(
	'Sub-workflow group',
	{ annotation: [{ type: 'owner', description: 'Adore' }] },
	() => {
		test('renders as a collapsed chip and keeps the title bar anchored on expand', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow(FIXTURE);
			await n8n.canvas.clickZoomToFitButton();

			const chip = n8n.canvas.getNodeGroupByTitle('Call My Sub-workflow');
			await expect(chip).toBeVisible();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(1); // host hidden

			const before = await n8n.canvas.getNodeGroupBoundingBox('Call My Sub-workflow');

			await n8n.canvas.toggleNodeGroup('Call My Sub-workflow');
			await n8n.page.waitForTimeout(400);
			const after = await n8n.canvas.getNodeGroupBoundingBox('Call My Sub-workflow');

			// The title bar top-left must stay put when the frame grows downward on expand.
			expect(Math.abs(after.x - before.x)).toBeLessThan(2);
			expect(Math.abs(after.y - before.y)).toBeLessThan(2);
		});
	},
);
