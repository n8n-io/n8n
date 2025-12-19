import { test, expect } from '../../../fixtures/base';

/**
 * Regression test for GHC-5776
 * https://linear.app/n8n/issue/GHC-5776/community-issue-plan-lacks-license-for-this-feature
 *
 * The AI builder was calling /rest/ai/sessions/metadata endpoint even when the
 * AI builder feature was not licensed, causing 403 errors in the console.
 * This test verifies that no such errors occur when navigating to the canvas.
 */
test.describe('GHC-5776: AI sessions metadata should not cause console errors', () => {
	test('should not log license errors when navigating to canvas without AI builder license', async ({
		n8n,
	}) => {
		await n8n.start.fromBlankCanvas();

		// This is just to trigger the watch on the workflow id, which will trigger the fetch of the sessions metadata
		await n8n.canvas.getWorkflowSaveButton().click();

		const consoleMessages = await n8n.page.consoleMessages();
		const errorMessages = consoleMessages.filter((msg) => msg.type() === 'error');
		expect(errorMessages).toHaveLength(0);
	});
});
