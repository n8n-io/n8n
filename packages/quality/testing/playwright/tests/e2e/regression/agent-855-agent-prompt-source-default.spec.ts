import {
	AGENT_NODE_NAME,
	CHAT_TRIGGER_NODE_DISPLAY_NAME,
	MANUAL_CHAT_TRIGGER_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	NO_OPERATION_NODE_NAME,
	WEBHOOK_NODE_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'AGENT-855 Agent prompt source defaults',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		for (const [triggerName, displayName] of [
			[MANUAL_TRIGGER_NODE_NAME, MANUAL_TRIGGER_NODE_DISPLAY_NAME],
			[WEBHOOK_NODE_NAME, WEBHOOK_NODE_NAME],
		]) {
			test(`should default to Define below when added after a ${triggerName}`, async ({ n8n }) => {
				await n8n.start.fromBlankCanvas();
				await n8n.canvas.addNode(triggerName, { closeNDV: triggerName === WEBHOOK_NODE_NAME });
				await n8n.canvas.addNode(AGENT_NODE_NAME, { fromNode: displayName });

				await expect(
					n8n.canvas.connectionBetweenNodes(displayName, AGENT_NODE_NAME),
				).toBeAttached();
				await expect(n8n.ndv.getParameterInputField('promptType')).toHaveValue('Define below');
				await expect(n8n.ndv.getParameterTextarea('text')).toBeEditable();
				await expect(n8n.ndv.getParameterTextarea('text')).toHaveValue('');

				await n8n.ndv.getParameterTextarea('text').fill('Summarize the input');
				await n8n.ndv.close();
				await n8n.canvas.openNode(AGENT_NODE_NAME);
				await expect(n8n.ndv.getParameterInputField('promptType')).toHaveValue('Define below');
				await expect(n8n.ndv.getParameterTextarea('text')).toHaveValue('Summarize the input');
			});
		}

		test('should default to the chat prompt source when added with a Chat Trigger', async ({
			n8n,
		}) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(AGENT_NODE_NAME);

			await expect(
				n8n.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, AGENT_NODE_NAME),
			).toBeAttached();
			await expect(n8n.ndv.getParameterInputField('promptType')).toHaveValue(
				'Connected Chat Trigger Node',
			);
		});

		test('should keep the chat prompt source through an intermediate node', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(MANUAL_CHAT_TRIGGER_NODE_NAME, {
				trigger: 'On new Chat event',
				closeNDV: true,
			});
			await n8n.canvas.addNode(NO_OPERATION_NODE_NAME, {
				fromNode: CHAT_TRIGGER_NODE_DISPLAY_NAME,
				closeNDV: true,
			});
			await n8n.canvas.addNode(AGENT_NODE_NAME, { fromNode: NO_OPERATION_NODE_NAME });

			await expect(
				n8n.canvas.connectionBetweenNodes(CHAT_TRIGGER_NODE_DISPLAY_NAME, NO_OPERATION_NODE_NAME),
			).toBeAttached();
			await expect(
				n8n.canvas.connectionBetweenNodes(NO_OPERATION_NODE_NAME, AGENT_NODE_NAME),
			).toBeAttached();
			await expect(n8n.ndv.getParameterInputField('promptType')).toHaveValue(
				'Connected Chat Trigger Node',
			);
		});
	},
);
