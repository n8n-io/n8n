import { setupInstanceAiMocks } from '../../../composables/InstanceAiComposer';
import { buildDelegationSSE } from '../../../config/instance-ai-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe('Instance AI - Sub-Agents', () => {
	test('should render delegated sub-agent in agent tree', async ({ n8n }) => {
		const childResult = 'Built the workflow successfully';
		const sseBody = buildDelegationSSE('workflow-builder', childResult);
		await setupInstanceAiMocks(n8n.page, sseBody);
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Build a new workflow for me');
		await n8n.instanceAi.waitForResponseComplete();

		// The assistant message should be visible and contain the sub-agent result text
		const assistantMessage = n8n.instanceAi.getAssistantMessages().first();
		await expect(assistantMessage).toBeVisible();
		await expect(assistantMessage).toContainText(childResult);
	});
});
