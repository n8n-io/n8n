import { test, expect } from '../../../../../fixtures/base';

/**
 * The editor downloads a file of an execution through `GET /rest/binary-data`,
 * which checks that the user may read the execution that owns the file. An
 * engine v2 execution has no row in the v1 execution table, so the check must
 * not look there. On a stack without engine v2 the same spec covers the v1
 * path.
 */
test.describe(
	'Binary data download from the NDV',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('downloads a file that the run stored @engine:v2', async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('binary-data-download.json');
			await n8n.canvas.clickExecuteWorkflowButton();

			await n8n.canvas.openNode('Convert to File');
			await expect(n8n.ndv.outputPanel.getDataContainer()).toBeVisible();
			await n8n.ndv.outputPanel.switchDisplayMode('binary');

			const downloadPromise = n8n.page.waitForEvent('download');
			await n8n.ndv.outputPanel.getDownloadBinaryDataButton().click();
			const download = await downloadPromise;

			// A refused download arrives as a failed event, not as an exception.
			expect(await download.failure()).toBeNull();
			expect(download.suggestedFilename()).toBe('download.txt');
			const chunks: Buffer[] = [];
			for await (const chunk of await download.createReadStream()) {
				chunks.push(Buffer.from(chunk));
			}
			expect(Buffer.concat(chunks).toString('utf8')).toBe('the editor downloads this file');
		});
	},
);
