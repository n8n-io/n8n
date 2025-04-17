import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { SEND_AND_WAIT_OPERATION, type IExecuteFunctions, type INode } from 'n8n-workflow';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';

jest.mock('../../../../v2/transport', () => {
	const originalModule = jest.requireActual('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: jest.fn(),
	};
});

describe('Test MicrosoftTeamsV2, chatMessage => sendAndWait', () => {
	let microsoftTeamsV2: MicrosoftTeamsV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		microsoftTeamsV2 = new MicrosoftTeamsV2(versionDescription);
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'operation') return SEND_AND_WAIT_OPERATION;
			if (key === 'resource') return 'chatMessage';
			if (key === 'chatId') return 'chatID';
			if (key === 'message') return 'my message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'options.limitWaitTime.values') return {};
		});

		mockExecuteFunctions.putExecutionToWait.mockImplementation();
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));

		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('http://localhost/waiting-webhook');
		mockExecuteFunctions.evaluateExpression.mockReturnValueOnce('nodeID');

		const result = await microsoftTeamsV2.execute.call(mockExecuteFunctions);

		expect(result).toEqual([items]);
		expect(transport.microsoftApiRequest).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(transport.microsoftApiRequest).toHaveBeenCalledWith(
			'POST',
			'/v1.0/chats/chatID/messages',
			{
				body: {
					content:
						'my message<br><br><a href="http://localhost/waiting-webhook/nodeID?approved=true">Approve</a><br><br><em>This message was sent automatically with <a href="https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.microsoftTeams_instanceId">n8n</a></em>',
					contentType: 'html',
				},
			},
		);
	});
});
