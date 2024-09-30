import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import {
	WAIT_NODE_TYPE,
	type IExecuteFunctions,
	type INode,
	type NodeTypeAndVersion,
} from 'n8n-workflow';

import { RespondToWebhook } from '../RespondToWebhook.node';

describe('RespondToWebhook Node', () => {
	let respondToWebhook: RespondToWebhook;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		respondToWebhook = new RespondToWebhook();
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	describe('execute method', () => {
		it('should throw an error if no WEBHOOK_NODE_TYPES in parents', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: 'n8n-nodes-base.someNode' }),
			]);

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'No Webhook node found in the workflow',
			);
		});
		it('should not throw an error if WEBHOOK_NODE_TYPES is in parents', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: WAIT_NODE_TYPE }),
			]);
			mockExecuteFunctions.getNodeParameter.mockReturnValue('text');
			mockExecuteFunctions.getNodeParameter.mockReturnValue({});
			mockExecuteFunctions.getNodeParameter.mockReturnValue('noData');
			mockExecuteFunctions.sendResponse.mockReturnValue();

			await expect(respondToWebhook.execute.call(mockExecuteFunctions)).resolves.not.toThrow();
		});
	});
});
