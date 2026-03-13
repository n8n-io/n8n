import { nanoid } from 'nanoid';

import { setupInstanceAiMocks } from '../../../composables/InstanceAiComposer';
import { buildHITLConfirmationSSE } from '../../../config/instance-ai-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe('Instance AI - HITL Confirmation', () => {
	test('should show confirmation prompt and approve action', async ({ n8n }) => {
		const requestId = nanoid();
		const sseBody = buildHITLConfirmationSSE(requestId, 'Run this workflow?');
		await setupInstanceAiMocks(n8n.page, sseBody);
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Run my workflow');

		// Wait for the confirmation buttons to appear
		await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible();
		await expect(n8n.instanceAi.getConfirmDenyButton()).toBeVisible();

		// Intercept the confirm POST request
		const confirmPromise = n8n.page.waitForRequest(
			(req) => req.url().includes('/instance-ai/confirm/') && req.method() === 'POST',
		);

		await n8n.instanceAi.getConfirmApproveButton().click();

		// Verify the confirm endpoint was called
		const confirmRequest = await confirmPromise;
		expect(confirmRequest.url()).toContain(`/instance-ai/confirm/${requestId}`);
	});

	test('should show confirmation prompt and deny action', async ({ n8n }) => {
		const requestId = nanoid();
		const sseBody = buildHITLConfirmationSSE(requestId, 'Run this workflow?');
		await setupInstanceAiMocks(n8n.page, sseBody);
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Run my workflow');

		// Wait for the confirmation buttons to appear
		await expect(n8n.instanceAi.getConfirmApproveButton()).toBeVisible();
		await expect(n8n.instanceAi.getConfirmDenyButton()).toBeVisible();

		// Intercept the confirm POST request
		const confirmPromise = n8n.page.waitForRequest(
			(req) => req.url().includes('/instance-ai/confirm/') && req.method() === 'POST',
		);

		await n8n.instanceAi.getConfirmDenyButton().click();

		// Verify the confirm endpoint was called
		const confirmRequest = await confirmPromise;
		expect(confirmRequest.url()).toContain(`/instance-ai/confirm/${requestId}`);
	});
});
