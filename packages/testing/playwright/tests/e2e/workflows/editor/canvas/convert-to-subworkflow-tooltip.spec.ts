import { test, expect } from '../../../../../fixtures/base';

const FIXTURE = 'Convert-to-subworkflow-tooltip-fixture.json';

// The selection contains 4 extractable nodes, so the button tooltip reads
// "Convert 4 nodes to sub-workflow" — the exact string reported in ADO-5582.
const EXPECTED_TOOLTIP = 'Convert 4 nodes to sub-workflow';

test.describe(
	'Convert to sub-workflow button tooltip',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow(FIXTURE);
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();
		});

		// Regression test for ADO-5582: the tooltip above a multi-node selection was
		// cut off mid-word (e.g. "Convert 4 nodes to sub-workf") instead of wrapping
		// to show the full label.
		test('shows the full label without cutting it off', async ({ n8n }) => {
			await n8n.canvas.selectNodes(['Set A', 'Set B', 'Set C', 'Set D']);

			const extractButton = n8n.canvas.selectionToolbar.extractSubWorkflowButton();
			await expect(extractButton).toBeVisible();
			await extractButton.hover();

			const tooltip = n8n.canvas.selectionToolbar.tooltip();
			await expect(tooltip).toBeVisible();
			await expect(tooltip).toContainText(EXPECTED_TOOLTIP);

			// The label must wrap within the tooltip box rather than overflow it.
			// When it overflows, the text is clipped on the canvas and reads e.g.
			// "Convert 4 nodes to sub-workf".
			const overflow = await tooltip.evaluate((el) => el.scrollWidth - el.clientWidth);
			expect(overflow).toBeLessThanOrEqual(1);
		});
	},
);
