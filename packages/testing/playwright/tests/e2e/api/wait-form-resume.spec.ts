import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';

test.describe(
	'Wait Node Form Resume',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
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

		test.describe('resume url endpoint redirect', () => {
			test('should redirect a form-resume request from webhook-waiting to form-waiting', async ({
				api,
			}) => {
				const { webhookPath, workflowId } =
					await api.workflows.importWorkflowFromFile('wait-form-resume.json');

				// Trigger workflow via webhook to reach waiting state
				const triggerResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
				});
				expect(triggerResponse.ok()).toBe(true);

				const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');
				expect(execution).toBeDefined();

				// Read the signed form-waiting URL captured by the Set node
				const fullExecution = await api.workflows.getExecution(execution.id);
				const executionData = flatted.parse(fullExecution.data);
				const formUrl = executionData.resultData.runData['Capture Form URL'][0].data.main[0][0].json
					.formUrl as string;

				// Simulate a user who used `$execution.resumeUrl` (webhook-waiting) instead of
				// `$execution.resumeFormUrl`. Both carry the same opaque resume token, so
				// rewriting the endpoint segment yields a valid webhook-waiting resume URL.
				const webhookWaitingUrl = formUrl.replace('/form-waiting/', '/webhook-waiting/');
				expect(webhookWaitingUrl).toContain('/webhook-waiting/');
				const { pathname, search } = new URL(webhookWaitingUrl);
				const resumePath = `${pathname}${search}`;

				// Without following the redirect, the request is answered with a 307 to form-waiting
				const redirectResponse = await api.webhooks.trigger(resumePath, {
					maxRedirects: 0,
					maxNotFoundRetries: 0,
				});
				expect(redirectResponse.status()).toBe(307);
				const location = redirectResponse.headers().location;
				expect(location).toContain('/form-waiting/');
				expect(location).not.toContain('/webhook-waiting/');

				// Following the redirect renders the form served by form-waiting
				const formResponse = await api.webhooks.trigger(resumePath, { maxNotFoundRetries: 0 });
				expect(formResponse.ok()).toBe(true);
				expect(await formResponse.text()).toContain('Test Form');
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

				const formPagePromise = PublicFormPage.fromPopup(n8n.page.context());
				await n8n.canvas.clickExecuteWorkflowButton();

				const formPage = await formPagePromise;

				await formPage.expectText('Test Wait Form');
				await expect(formPage.getField('Test Field')).toBeVisible();

				const url = formPage.url();
				expect(url).toContain('form-waiting');
				expect(url).toContain('signature=');

				await formPage.fillField('Test Field', 'test value');
				await formPage.submit();

				await formPage.expectText('Your response has been recorded');
				await formPage.close();

				await n8n.canvas.openNode('Wait');
				await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toContainText('test value');
			});
		});
	},
);
