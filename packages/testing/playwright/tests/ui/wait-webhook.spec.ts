import { test, expect } from '../../fixtures/base';

test.describe('Wait node with resume on webhook call', () => {
	test('should continue when the resume URL is called', async ({ api }) => {
		const { webhookPath, workflowId } = await api.workflowApi.importWorkflow(
			'wait-node-resume-from-webhook.json',
		);

		const startWebhookResponse = await api.request.post(`/webhook/${webhookPath}`);
		expect(startWebhookResponse.ok()).toBe(true);

		const body = (await startWebhookResponse.json()) as {
			executionId: number;
			resumeUrl: string;
		};
		expect(body).toEqual(
			expect.objectContaining({
				executionId: expect.any(Number),
				resumeUrl: expect.any(String),
			}),
		);

		const execution = await api.workflowApi.getExecution(body.executionId.toString());
		expect(execution.status).toBe('waiting');

		const waitWebhookResponse = await api.request.get(body.resumeUrl);
		expect(waitWebhookResponse.ok()).toBe(true);

		await api.workflowApi.waitForExecution(workflowId);
	});
});
