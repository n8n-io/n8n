import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';

/**
 * Security tests for waiting endpoint signature validation.
 *
 * These tests verify that form-waiting and webhook-waiting endpoints
 * require valid HMAC signatures to prevent session interception attacks.
 *
 * Note: Send and Wait approval flow tests are in nodes/send-and-wait.spec.ts
 */
test.describe('Waiting Endpoint Security', () => {
	test.describe('webhook-waiting signature validation', () => {
		test('should reject unsigned and tampered requests, accept valid signature', async ({
			api,
		}) => {
			const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
				'wait-webhook-resume.json',
			);

			const triggerResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
			});
			expect(triggerResponse.ok()).toBe(true);

			const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');
			expect(execution).toBeDefined();

			const unsignedResponse = await api.webhooks.trigger(`/webhook-waiting/${execution.id}`, {
				maxNotFoundRetries: 0,
			});
			expect(unsignedResponse.status()).toBe(401);

			const tamperedResponse = await api.webhooks.trigger(
				`/webhook-waiting/${execution.id}?signature=tampered_invalid_signature_abc123`,
				{ maxNotFoundRetries: 0 },
			);
			expect(tamperedResponse.status()).toBe(401);

			const fullExecution = await api.workflows.getExecution(execution.id);
			expect(fullExecution.data).toBeDefined();

			const executionData = flatted.parse(fullExecution.data);
			const captureNodeOutput = executionData.resultData.runData['Capture Resume URL'];
			expect(captureNodeOutput).toBeDefined();

			const resumeUrl = captureNodeOutput[0].data.main[0][0].json.resumeUrl;
			expect(resumeUrl).toBeDefined();
			expect(resumeUrl).toContain('signature=');

			// Accept valid signature
			const urlObj = new URL(resumeUrl);
			const signedPath = `${urlObj.pathname}${urlObj.search}`;

			const signedResponse = await api.webhooks.trigger(signedPath, {
				maxNotFoundRetries: 0,
			});
			expect(signedResponse.ok()).toBe(true);

			const completedExecution = await api.workflows.waitForWorkflowStatus(
				workflowId,
				'success',
				10000,
			);
			expect(completedExecution.status).toBe('success');
		});
	});

	test.describe('form-waiting signature validation', () => {
		test('should reject unsigned and tampered requests, accept valid signature', async ({
			n8n,
		}) => {
			await n8n.start.fromBlankCanvas();

			await n8n.canvas.clickNodeCreatorPlusButton();
			await n8n.canvas.nodeCreatorItemByName('On form submission').click();
			await n8n.ndv.fillParameterInput('Form Title', 'Security Test Form');
			await n8n.ndv.fillParameterInput('Form Description', 'Testing signature validation');
			await n8n.ndv.addFixedCollectionItem();
			await n8n.ndv.fillParameterInputByName('fieldLabel', 'First field');
			await n8n.ndv.clickBackToCanvasButton();

			await n8n.canvas.addNode('n8n Form', { closeNDV: false, action: 'Next Form Page' });
			await n8n.ndv.addFixedCollectionItem();
			await n8n.ndv.fillParameterInputByName('fieldLabel', 'Second field');
			await n8n.ndv.clickBackToCanvasButton();

			await n8n.canvas.clickExecuteWorkflowButton();
			await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

			await n8n.canvas.openNode('On form submission');
			const formUrlLocator = n8n.page.locator('text=/form-test\\/[a-f0-9-]+/');
			await expect(formUrlLocator).toHaveText(/form-test\/[a-f0-9-]+/);
			const formUrl = await formUrlLocator.textContent();

			const formPage = await n8n.page.context().newPage();
			await formPage.goto(formUrl!);
			await formPage.getByLabel('First field').fill('test value');

			const responsePromise = formPage.waitForResponse(
				(resp) => resp.url().includes('/form-test/') && resp.request().method() === 'POST',
			);
			await formPage.getByRole('button', { name: 'Submit' }).click();

			const postResponse = await responsePromise;
			const responseBody = await postResponse.json();

			expect(responseBody.formWaitingUrl).toBeDefined();
			const waitingUrl: string = responseBody.formWaitingUrl;
			expect(waitingUrl).toContain('signature=');

			const urlObj = new URL(waitingUrl);
			const executionId = urlObj.pathname.split('/').pop()!;
			const validSignature = urlObj.searchParams.get('signature');

			await expect(async () => {
				const execution = await n8n.api.workflows.getExecution(executionId);
				expect(execution.status).toBe('waiting');
			}).toPass();

			const unsignedResponse = await n8n.api.webhooks.trigger(`/form-waiting/${executionId}`, {
				maxNotFoundRetries: 0,
			});
			expect(unsignedResponse.status()).toBe(401);

			const tamperedResponse = await n8n.api.webhooks.trigger(
				`/form-waiting/${executionId}?signature=tampered_fake_signature_xyz789`,
				{ maxNotFoundRetries: 0 },
			);
			expect(tamperedResponse.status()).toBe(401);

			const signedResponse = await n8n.api.webhooks.trigger(
				`/form-waiting/${executionId}?signature=${validSignature}`,
				{ maxNotFoundRetries: 0 },
			);
			expect(signedResponse.ok()).toBe(true);

			await formPage.close();
		});
	});
});
