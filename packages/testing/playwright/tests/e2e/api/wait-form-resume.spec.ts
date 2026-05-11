import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';

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

			const unsignedResponse = await api.webhooks.trigger(`/form-waiting/${execution.id}`);
			expect(unsignedResponse.status()).toBe(401);

			// Verify HTML error page (not JSON)
			const unsignedText = await unsignedResponse.text();
			expect(unsignedText).toContain('<!DOCTYPE html>');
			expect(unsignedText).toContain('Invalid Form Link');

			// Try tampered signature - should also get 401
			const tamperedResponse = await api.webhooks.trigger(
				`/form-waiting/${execution.id}?signature=tampered_invalid_signature_abc123`,
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
		test('should open form when Wait node enters waiting state', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();

			await n8n.canvas.clickNodeCreatorPlusButton();
			await n8n.canvas.nodeCreatorItemByName('Trigger manually').click();

			await n8n.canvas.addNode('Wait', { closeNDV: false });
			await n8n.ndv.setParameterDropdown('resume', 'On Form Submitted');
			await n8n.ndv.fillParameterInput('Form Title', 'Test Wait Form');
			await n8n.ndv.addFixedCollectionItem();
			await n8n.ndv.fillParameterInputByName('fieldLabel', 'Test Field');
			await n8n.ndv.clickBackToCanvasButton();

			const popupPromise = n8n.page.context().waitForEvent('page');
			await n8n.canvas.clickExecuteWorkflowButton();

			const formPage = await popupPromise;

			await expect(formPage.getByText('Test Wait Form')).toBeVisible();
			await expect(formPage.getByLabel('Test Field')).toBeVisible();

			const url = formPage.url();
			expect(url).toContain('form-waiting');
			expect(url).toContain('signature=');

			await formPage.getByLabel('Test Field').fill('test value');
			await formPage.getByRole('button', { name: 'Submit' }).click();

			await expect(formPage.getByText('Your response has been recorded')).toBeVisible();
			await formPage.close();

			await n8n.canvas.openNode('Wait');
			await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('test value');
		});
	});
});
