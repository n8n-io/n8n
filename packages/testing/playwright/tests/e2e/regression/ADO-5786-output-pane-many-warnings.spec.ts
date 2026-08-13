import { test, expect } from '../../../fixtures/base';

// The fixture's Split Out node is asked for 20 fields that no input item has, so the
// output pane renders exactly 20 warning callouts above a 20 row table. No
// credentials, no network, no code sandbox: the warning count is deterministic.
const EXPECTED_WARNINGS = 20;

// Warnings are secondary to the data: whatever their number, the table keeps the
// larger share of the pane and the warnings stay within their capped area.
// Pre-fix the warnings ate the whole column and the data container was 0px high.
const MIN_DATA_SHARE_OF_PANE = 0.4;
const MAX_WARNINGS_SHARE_OF_PANE = 0.5;

// Layout settles a frame or two after the table renders, so retry the measurement
// rather than sampling it once.
const LAYOUT_TIMEOUT = 5000;

test.describe(
	'ADO-5786 NDV output pane stays usable with many warnings',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('keeps the output table readable when the node reports many warnings', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_ndv_many_output_warnings.json');

			await n8n.canvas.openNode('Split Out');
			await n8n.ndv.execute();
			await n8n.notifications.quickCloseAll();

			// The state under test: many warnings stacked above the table
			await expect(n8n.ndv.outputPanel.getNodeHints()).toHaveCount(EXPECTED_WARNINGS);
			await expect(n8n.ndv.outputPanel.getTable()).toBeVisible();

			await expect(async () => {
				const paneHeight = (await n8n.ndv.outputPanel.get().boundingBox())?.height ?? 0;
				const dataHeight =
					(await n8n.ndv.outputPanel.getDataContainer().boundingBox())?.height ?? 0;
				const warningsHeight =
					(await n8n.ndv.outputPanel.getHintsContainer().boundingBox())?.height ?? 0;

				expect(paneHeight).toBeGreaterThan(0);
				expect(dataHeight).toBeGreaterThan(paneHeight * MIN_DATA_SHARE_OF_PANE);
				expect(warningsHeight).toBeLessThan(paneHeight * MAX_WARNINGS_SHARE_OF_PANE);
			}).toPass({ timeout: LAYOUT_TIMEOUT });

			// Readable, not just present: the table isn't clipped out of view
			await expect(n8n.ndv.outputPanel.getTableHeader(0)).toBeInViewport();
			await expect(n8n.ndv.outputPanel.getTableRow(1)).toBeInViewport();

			// The warnings themselves stay reachable, they just scroll within their own area
			await expect(n8n.ndv.outputPanel.getNodeHints().first()).toBeInViewport();
		});
	},
);
