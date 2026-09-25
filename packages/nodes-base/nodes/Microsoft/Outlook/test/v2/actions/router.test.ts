import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { router } from '../../../v2/actions/router';

describe('MicrosoftOutlookV2 - router error attribution', () => {
	it('stamps context.itemIndex on a NodeError from the failing item', async () => {
		const mockExecuteFunctions: Mocked<IExecuteFunctions> = mockDeep<IExecuteFunctions>();
		const mockNode: INode = {
			id: 'test-node',
			name: 'Test Outlook Node',
			type: 'n8n-nodes-base.microsoftOutlook',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			accessToken: 'test-access-token',
			graphApiBaseUrl: '',
		});
		mockExecuteFunctions.helpers.requestWithAuthentication = vi.fn().mockResolvedValue({});
		(mockExecuteFunctions.helpers.constructExecutionMetaData as Mock).mockReturnValue([]);
		// message:delete on two items: item 0's mailbox is valid, item 1's is not — the
		// unstamped validator error must leave the router carrying item 1's index.
		mockExecuteFunctions.getNodeParameter.mockImplementation((name, itemIndex, fallback) => {
			const params: Record<string, unknown> = {
				resource: 'message',
				operation: 'delete',
				authentication: 'microsoftEntraServicePrincipalApi',
				messageId: 'MSG1',
			};
			if (name === 'mailbox')
				return (itemIndex === 1 ? 'contoso.com' : 'user@example.com') as never;
			return (name in params ? params[name] : fallback) as never;
		});

		let caught: unknown;
		try {
			await router.call(mockExecuteFunctions);
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(NodeOperationError);
		expect((caught as NodeOperationError).message).toBe('The mailbox is not valid');
		expect((caught as NodeOperationError).context.itemIndex).toBe(1);
	});
});
