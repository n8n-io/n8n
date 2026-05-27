import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type INode, SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { Telegram } from '../../Telegram.node';

jest.mock('../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../GenericFunctions');
	return {
		...originalModule,
		apiRequest: jest.fn(),
	};
});

describe('Test Telegram, message => sendAndWait', () => {
	let telegram: Telegram;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		telegram = new Telegram();
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		const items = [{ json: { data: 'test' } }];
		//node
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');

		//createSendAndWaitMessageBody
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');

		//getSendAndWaitConfig
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');

		// configureWaitTillDate
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); //options.limitWaitTime.values

		const result = await telegram.execute.call(mockExecuteFunctions);

		expect(result).toEqual([items]);
		expect(genericFunctions.apiRequest).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'sendMessage', {
			chat_id: 'chatID',
			disable_web_page_preview: true,
			parse_mode: 'Markdown',
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: 'Approve',
							url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
						},
					],
				],
			},
			text: 'my message\n\n_This message was sent automatically with _[n8n](https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram_instanceId)',
		});
	});

	it('should route API errors to error output when continueOnFail is true', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		(genericFunctions.apiRequest as jest.Mock).mockRejectedValueOnce(new Error('chat_not_found'));

		const result = await telegram.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { error: 'chat_not_found' } }]]);
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('should rethrow API errors when continueOnFail is false', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(genericFunctions.apiRequest as jest.Mock).mockRejectedValueOnce(new Error('chat_not_found'));

		await expect(telegram.execute.call(mockExecuteFunctions)).rejects.toThrow('chat_not_found');
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});
});
