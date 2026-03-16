import { setupInstanceAiMocks } from '../../../composables/InstanceAiComposer';
import { buildToolCallSSE, buildToolErrorSSE } from '../../../config/instance-ai-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe('Instance AI - Tool Calls', () => {
	test('should render tool call with completed result', async ({ n8n }) => {
		const sseBody = buildToolCallSSE('list-workflows', {}, [{ id: '1', name: 'Test' }]);
		await setupInstanceAiMocks(n8n.page, sseBody);
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('List my workflows');
		await n8n.instanceAi.waitForResponseComplete();

		// Tool call element should be visible
		const toolCall = n8n.instanceAi.getToolCalls().first();
		await expect(toolCall).toBeVisible();

		// Should contain the tool display label in the trigger
		await expect(toolCall).toContainText('Listing workflows');

		// Expand to verify there is no error section — only Input and Output
		await toolCall.locator('button').first().click();
		await expect(toolCall.getByText('Output')).toBeVisible();
		await expect(toolCall.getByText('Error')).toBeHidden();
	});

	test('should render tool call with error state', async ({ n8n }) => {
		const sseBody = buildToolErrorSSE('run-workflow', { workflowId: '123' }, 'Workflow not found');
		await setupInstanceAiMocks(n8n.page, sseBody);
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Run workflow 123');
		await n8n.instanceAi.waitForResponseComplete();

		// Tool call element should be visible
		const toolCall = n8n.instanceAi.getToolCalls().first();
		await expect(toolCall).toBeVisible();

		// Should contain the tool display label
		await expect(toolCall).toContainText('Running workflow');

		// Expand the tool call to reveal the error section
		await toolCall.locator('button').first().click();

		// Error text should be visible inside the expanded content
		await expect(toolCall.getByText('Workflow not found')).toBeVisible();
		await expect(toolCall.getByText('Error')).toBeVisible();
	});

	test('should expand tool call to show arguments and result', async ({ n8n }) => {
		const sseBody = buildToolCallSSE('list-workflows', { limit: 10 }, [
			{ id: '1', name: 'My Workflow' },
		]);
		await setupInstanceAiMocks(n8n.page, sseBody);
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Show me workflows');
		await n8n.instanceAi.waitForResponseComplete();

		const toolCall = n8n.instanceAi.getToolCalls().first();
		await expect(toolCall).toBeVisible();

		// Click the collapsible trigger to expand
		await toolCall.locator('button').first().click();

		// Input section should be visible with the "Input" label
		await expect(toolCall.getByText('Input')).toBeVisible();

		// Output section should be visible with the "Output" label
		await expect(toolCall.getByText('Output')).toBeVisible();
	});
});
