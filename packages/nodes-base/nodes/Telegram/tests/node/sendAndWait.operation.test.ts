import { Container } from '@n8n/di';
import { InstanceSettings, parseHitlCallbackReference } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import { type INode, SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { Telegram } from '../../Telegram.node';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../GenericFunctions';

const TEST_HMAC_SECRET = 'test-hmac-secret';
Container.set(InstanceSettings, { hmacSignatureSecret: TEST_HMAC_SECRET } as InstanceSettings);

vi.mock('../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../GenericFunctions');
	return {
		...originalModule,
		apiRequest: vi.fn(),
	};
});

describe('Test Telegram, message => sendAndWait', () => {
	let telegram: Telegram;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let customDataGet: Mock;
	let customDataSet: Mock;

	beforeEach(() => {
		telegram = new Telegram();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		const backingStore = new Map<string, string>();
		customDataSet = vi.fn((key: string, value: string) => {
			backingStore.set(key, value);
		});
		customDataGet = vi.fn((key: string) => backingStore.get(key) ?? '');
		// mock-extended cannot proxy IWorkflowExecutionCustomData (index signature)
		mockExecuteFunctions.customData = {
			get: customDataGet,
			set: customDataSet,
		} as unknown as IExecuteFunctions['customData'];
		mockExecuteFunctions.logger = {
			warn: vi.fn(),
		} as unknown as IExecuteFunctions['logger'];
	});
	afterEach(() => {
		vi.clearAllMocks();
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
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)

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
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options (deleteOnResponse check)

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
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options (deleteOnResponse check)
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		(genericFunctions.apiRequest as Mock).mockRejectedValueOnce(new Error('chat_not_found'));

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
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options (deleteOnResponse check)
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(genericFunctions.apiRequest as Mock).mockRejectedValueOnce(new Error('chat_not_found'));

		await expect(telegram.execute.call(mockExecuteFunctions)).rejects.toThrow('chat_not_found');
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('should store the delete target in execution metadata when deleteOnResponse is on', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ deleteOnResponse: true }); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval'); // responseType
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ deleteOnResponse: true }); // options (deleteOnResponse check)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options.limitWaitTime.values
		(genericFunctions.apiRequest as Mock).mockResolvedValueOnce({
			ok: true,
			result: { message_id: 55, chat: { id: 999 } },
		});

		await telegram.execute.call(mockExecuteFunctions);
		expect(customDataSet).toHaveBeenCalledWith(
			'tgDeleteTarget',
			JSON.stringify({ chatId: 999, messageId: 55 }),
		);
		// A landed write must not trigger the dropped-write warning.
		expect(mockExecuteFunctions.logger.warn).not.toHaveBeenCalled();
	});

	it('should not store a delete target when deleteOnResponse is off', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval'); // responseType
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options (deleteOnResponse check)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options.limitWaitTime.values

		await telegram.execute.call(mockExecuteFunctions);

		expect(customDataSet).not.toHaveBeenCalled();
	});

	it('should warn when the delete target write does not land because metadata is full', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false); // chatApproval (prepareChatApproval)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('chatID');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ deleteOnResponse: true }); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval'); // responseType
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ deleteOnResponse: true }); // options (deleteOnResponse check)
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options.limitWaitTime.values
		// Simulate the execution-metadata KV limit: set() drops the write silently.
		customDataSet.mockImplementation(() => {});

		await telegram.execute.call(mockExecuteFunctions);

		expect(customDataSet).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.logger.warn).toHaveBeenCalledWith(
			'Telegram node: could not store the message identity for Delete Message on Response because execution custom data is full',
		);
	});
});

describe('createSendAndWaitMessageBody - chat approval callback references', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('mints an approve callback with decision "a" and a decline callback with decision "d"', () => {
		const context = mock<IExecuteFunctions>();
		context.getExecutionId.mockReturnValue('exec-42');
		context.getInstanceId.mockReturnValue('instanceId');
		context.getSignedResumeUrl.mockImplementation(
			(params) =>
				`http://localhost/waiting-webhook/nodeID?approved=${params?.approved}&signature=abc`,
		);
		context.getNodeParameter.mockImplementation((name: string) => {
			switch (name) {
				case 'chatId':
					return 'chatID';
				case 'message':
					return 'my message';
				case 'subject':
					return 'my subject';
				case 'approvalOptions.values':
					return {
						approvalType: 'double',
						approveLabel: 'Approve',
						disapproveLabel: 'Decline',
					};
				case 'responseType':
					return 'approval';
				default:
					return {};
			}
		});

		const body = genericFunctions.createSendAndWaitMessageBody(context, true);

		const buttons = body.reply_markup.inline_keyboard[0] as Array<{
			text: string;
			callback_data: string;
		}>;
		const decisionForLabel = (label: string) => {
			const button = buttons.find((b) => b.text === label);
			return button && parseHitlCallbackReference(button.callback_data)?.decision;
		};

		expect(decisionForLabel('Approve')).toBe('a');
		expect(decisionForLabel('Decline')).toBe('d');
	});
});
