import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';

/**
 * Tests for Wait node with form resume mode.
 *
 * These tests verify that the Wait node with `resume=form` correctly:
 * 1. Opens form popup with valid signature during manual execution
 * 2. Rejects unsigned requests with HTML error page
 * 3. Accepts valid signatures and resumes workflow
 */
test.describe('Wait Node Form Resume', () => {
	test.describe('signature validation', () => {
		test('should reject unsigned and tampered requests, accept valid signature', async ({
			api,
		}) => {
			const { webhookPath, workflowId } =
				await api.workflows.importWorkflowFromFile('wait-form-resume.json');

			// Trigger workflow via webhook to reach waiting state
			const triggerResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
			});
			expect(triggerResponse.ok()).toBe(true);

			// Wait for workflow to reach waiting state
			const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');
			expect(execution).toBeDefined();

			// Try unsigned request - should get 401 with HTML error page
			const unsignedResponse = await api.webhooks.trigger(`/form-waiting/${execution.id}`, {
				maxNotFoundRetries: 0,
			});
			expect(unsignedResponse.status()).toBe(401);

			// Verify HTML error page (not JSON)
			const unsignedText = await unsignedResponse.text();
			expect(unsignedText).toContain('<!DOCTYPE html>');
			expect(unsignedText).toContain('Invalid Form Link');

			// Try tampered signature - should also get 401
			const tamperedResponse = await api.webhooks.trigger(
				`/form-waiting/${execution.id}?signature=tampered_invalid_signature_abc123`,
				{ maxNotFoundRetries: 0 },
			);
			expect(tamperedResponse.status()).toBe(401);

			// Get the valid signed URL from execution data
			const fullExecution = await api.workflows.getExecution(execution.id);
			expect(fullExecution.data).toBeDefined();

			const executionData = flatted.parse(fullExecution.data);
			const captureNodeOutput = executionData.resultData.runData['Capture Form URL'];
			expect(captureNodeOutput).toBeDefined();

			const formUrl = captureNodeOutput[0].data.main[0][0].json.formUrl;
			expect(formUrl).toBeDefined();
			expect(formUrl).toContain('signature=');

			// Extract path with signature and make valid request
			const urlObj = new URL(formUrl);
			const signedPath = `${urlObj.pathname}${urlObj.search}`;

			const signedResponse = await api.webhooks.trigger(signedPath, {
				maxNotFoundRetries: 0,
			});
			expect(signedResponse.ok()).toBe(true);
		});
	});

	test.describe('manual execution form popup', () => {
		test('should open form popup with valid signature when Wait node enters waiting state', async ({
			n8n,
		}) => {
			await n8n.start.fromBlankCanvas();

			// Add Manual Trigger
			await n8n.canvas.clickNodeCreatorPlusButton();
			await n8n.canvas.nodeCreatorItemByName('Execute workflow manually').click();

			// Add Wait node with form resume
			await n8n.canvas.addNode('Wait', { closeNDV: false });
			await n8n.ndv.setParameterSelectValue('Resume', 'On Form Submitted');
			await n8n.ndv.fillParameterInput('Form Title', 'Test Wait Form');
			await n8n.ndv.addFixedCollectionItem(); // Add form field
			await n8n.ndv.fillParameterInputByName('fieldLabel', 'Test Field');
			await n8n.ndv.clickBackToCanvasButton();

			// Execute workflow - should open form popup
			const popupPromise = n8n.page.context().waitForEvent('page');
			await n8n.canvas.clickExecuteWorkflowButton();

			// Wait for popup window to open
			const formPage = await popupPromise;

			// Verify form page loaded successfully (not error page)
			await expect(formPage.getByText('Test Wait Form')).toBeVisible({ timeout: 10000 });
			await expect(formPage.getByLabel('Test Field')).toBeVisible();

			// Verify URL contains signature
			const url = formPage.url();
			expect(url).toContain('form-waiting');
			expect(url).toContain('signature=');

			// Verify it's NOT the error page
			const pageContent = await formPage.content();
			expect(pageContent).not.toContain('Invalid Form Link');

			// Submit form
			await formPage.getByLabel('Test Field').fill('test value');
			await formPage.getByRole('button', { name: 'Submit' }).click();

			// Verify success message
			await expect(formPage.getByText('Your response has been recorded')).toBeVisible({
				timeout: 10000,
			});

			await formPage.close();
		});
	});
});
