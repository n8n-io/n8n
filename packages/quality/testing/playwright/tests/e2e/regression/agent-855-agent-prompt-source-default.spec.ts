import {
	AGENT_NODE_NAME,
	CHAT_TRIGGER_NODE_DISPLAY_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	MANUAL_TRIGGER_NODE_NAME,
} from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'AGENT-855 Agent prompt source defaults',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test('should default to Define below when added after a Manual Trigger', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(AGENT_NODE_NAME, {
				fromNode: MANUAL_TRIGGER_NODE_DISPLAY_NAME,
			});

			await expect(
				n8n.canvas.connectionBetweenNodes(MANUAL_TRIGGER_NODE_DISPLAY_NAME, AGENT_NODE_NAME),
			).toBeAttached();
			// AGENT-855: A new Agent must not select a prompt source that requires a Chat Trigger.
			await expect(n8n.ndv.getParameterInputField('promptType')).toHaveValue('Define below');
		});

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
	},
);
