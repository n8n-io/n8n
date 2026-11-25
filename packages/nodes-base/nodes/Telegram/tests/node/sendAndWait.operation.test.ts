import { buildHitlCallbackReference, parseHitlCallbackReference } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import { type INode, SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { Telegram } from '../../Telegram.node';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../GenericFunctions';

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

	beforeEach(() => {
		telegram = new Telegram();
		mockExecuteFunctions = mock<IExecuteFunctions>();
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
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('Markdown'); // options.parse_mode

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
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(genericFunctions.apiRequest as Mock).mockRejectedValueOnce(new Error('chat_not_found'));

		await expect(telegram.execute.call(mockExecuteFunctions)).rejects.toThrow('chat_not_found');
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});
});

describe('createSendAndWaitMessageBody - chat approval callback references', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('mints an approve callback with decision "a" and a decline callback with decision "d"', () => {
		const context = mock<IExecuteFunctions>();
		context.getApprovalCallbackReference.mockImplementation((decision) =>
			buildHitlCallbackReference('exec-42', decision === 'approve' ? 'a' : 'd', 'secret'),
		);
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

describe('createSendAndWaitMessageBody - parse mode', () => {
	const createContext = (options: Record<string, unknown>) => {
		const context = mock<IExecuteFunctions>();
		context.getInstanceId.mockReturnValue('instanceId');
		context.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		context.getNodeParameter.mockImplementation((name: string, _index, fallback) => {
			switch (name) {
				case 'chatId':
					return 'chatID';
				case 'message':
					return 'Approve My_Workflow';
				case 'subject':
					return '';
				case 'options':
					return options;
				case 'options.parse_mode':
					return options.parse_mode ?? fallback;
				case 'responseType':
					return 'approval';
				default:
					return {};
			}
		});
		return context;
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should default to Markdown when parse mode is not set', () => {
		const body = genericFunctions.createSendAndWaitMessageBody(
			createContext({ appendAttribution: false }),
		);

		expect(body.parse_mode).toBe('Markdown');
		expect(body.text).toBe('Approve My_Workflow');
	});

	it('should send plain text without parse_mode', () => {
		const body = genericFunctions.createSendAndWaitMessageBody(
			createContext({ appendAttribution: false, parse_mode: 'plainText' }),
		);

		expect(body).not.toHaveProperty('parse_mode');
		expect(body.text).toBe('Approve My_Workflow');
	});

	it.each(['HTML', 'MarkdownV2'])('should send the %s parse mode as selected', (parseMode) => {
		const body = genericFunctions.createSendAndWaitMessageBody(
			createContext({ appendAttribution: false, parse_mode: parseMode }),
		);

		expect(body.parse_mode).toBe(parseMode);
		expect(body.text).toBe('Approve My_Workflow');
	});

	it('should append HTML attribution to HTML messages', () => {
		const body = genericFunctions.createSendAndWaitMessageBody(
			createContext({ parse_mode: 'HTML' }),
		);

		expect(body.text).toContain('<em>This message was sent automatically with </em><a href=');
	});

	it('should append plain text attribution to plain text messages', () => {
		const body = genericFunctions.createSendAndWaitMessageBody(
			createContext({ parse_mode: 'plainText' }),
		);

		expect(body).not.toHaveProperty('parse_mode');
		expect(body.text).toBe(
			'Approve My_Workflow\n\nThis message was sent automatically with n8n: https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.telegram_instanceId',
		);
	});
});
