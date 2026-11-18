import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import { WAIT_INDEFINITELY, type IExecuteFunctions, type INode } from 'n8n-workflow';

import { configureTransport } from '../../EmailSend/v2/utils';
import { slackApiRequest } from '../../Slack/V2/GenericFunctions';
import { apiRequest as telegramApiRequest } from '../../Telegram/GenericFunctions';
import { QuorumApproval } from '../QuorumApproval.node';

vi.mock('../../EmailSend/v2/utils', () => ({ configureTransport: vi.fn() }));
vi.mock('../../Slack/V2/GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<object>()),
	slackApiRequest: vi.fn(),
}));
vi.mock('../../Telegram/GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<object>()),
	apiRequest: vi.fn(),
}));

const node = mock<INode>({ name: 'Quorum Approval' });

const approvers = [
	{ label: 'Finance lead', channel: 'email', email: 'finance@example.com' },
	{ label: '', channel: 'slack', slackTarget: 'user', slackUser: { mode: 'id', value: 'U123' } },
	{ label: 'Legal', channel: 'telegram', chatId: '42' },
];

describe('QuorumApproval', () => {
	let context: MockProxy<IExecuteFunctions>;
	let parameters: Record<string, unknown>;
	const sendMail = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		parameters = {
			channels: ['email', 'slack', 'telegram'],
			'approvers.approver': approvers,
			approvalsRequired: 'majority',
			customRequired: 2,
			approvalType: 'double',
			message: 'Ship it?',
			subject: 'Approval required',
			fromEmail: 'n8n@example.com',
			authentication: 'accessToken',
			'options.limitWaitTime.values': {},
		};
		context = mock<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation(
			(name: string, _index: number, fallback?: unknown) =>
				(name in parameters ? parameters[name] : fallback) as never,
		);
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getInstanceId.mockReturnValue('instance');
		context.getCredentials.mockResolvedValue({});
		context.getSignedResumeUrl.mockImplementation(
			(params = {}) => `https://n8n.test/webhook-waiting/step/node?${new URLSearchParams(params)}`,
		);
		vi.mocked(configureTransport).mockReturnValue({ sendMail } as never);
	});

	const execute = async () => await new QuorumApproval().execute.call(context);

	it('declares a ballot and sends each approver links that name the approver', async () => {
		await execute();

		expect(context.putExecutionToWait).toHaveBeenCalledWith(WAIT_INDEFINITELY, {
			ballot: {
				voters: [
					{ approver: 'Finance lead', channel: 'email' },
					{ approver: 'Slack · U123', channel: 'slack' },
					{ approver: 'Legal', channel: 'telegram' },
				],
				required: 2,
				allowDecline: true,
			},
		});
		expect(context.getSignedResumeUrl.mock.calls).toEqual([
			[{ vote: 'a', voter: '0' }],
			[{ vote: 'd', voter: '0' }],
			[{ vote: 'a', voter: '1' }],
			[{ vote: 'd', voter: '1' }],
			[{ vote: 'a', voter: '2' }],
			[{ vote: 'd', voter: '2' }],
		]);

		expect(sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'n8n@example.com',
				to: 'finance@example.com',
				subject: 'Approval required',
				html: expect.stringContaining('vote=a&voter=0') as string,
			}),
		);
		expect(slackApiRequest).toHaveBeenCalledWith(
			'POST',
			expect.anything(),
			expect.objectContaining({ channel: 'U123', text: 'Ship it?' }),
		);
		expect(telegramApiRequest).toHaveBeenCalledWith(
			'POST',
			'sendMessage',
			expect.objectContaining({
				chat_id: '42',
				reply_markup: {
					inline_keyboard: [
						[
							{ text: '❌ Decline', url: expect.stringContaining('vote=d&voter=2') as string },
							{ text: '✅ Approve', url: expect.stringContaining('vote=a&voter=2') as string },
						],
					],
				},
			}),
		);
	});

	it('waits before it sends, so engine v1 refuses the ballot before any message goes out', async () => {
		context.putExecutionToWait.mockRejectedValue(new Error('This node needs engine v2'));

		await expect(execute()).rejects.toThrow('This node needs engine v2');
		expect(sendMail).not.toHaveBeenCalled();
	});

	it('sends only approve links for approve only', async () => {
		parameters.approvalType = 'single';

		await execute();

		expect(context.getSignedResumeUrl).toHaveBeenCalledTimes(3);
		expect(context.putExecutionToWait).toHaveBeenCalledWith(
			WAIT_INDEFINITELY,
			expect.objectContaining({ ballot: expect.objectContaining({ allowDecline: false }) }),
		);
	});

	it('uses the message override of an approver', async () => {
		parameters['approvers.approver'] = [
			{ ...approvers[2], messageOverride: 'Legal, please check' },
		];
		parameters.channels = ['telegram'];

		await execute();

		expect(telegramApiRequest).toHaveBeenCalledWith(
			'POST',
			'sendMessage',
			expect.objectContaining({ text: 'Legal, please check' }),
		);
	});

	it.each([
		['any', 1],
		['majority', 2],
		['all', 3],
		['custom', 2],
	])('requires the approvals of %s', async (preset, required) => {
		parameters.approvalsRequired = preset;

		await execute();

		expect(context.putExecutionToWait).toHaveBeenCalledWith(
			WAIT_INDEFINITELY,
			expect.objectContaining({ ballot: expect.objectContaining({ required }) }),
		);
	});

	it('names the approver when a send fails', async () => {
		vi.mocked(telegramApiRequest).mockRejectedValue(new Error('chat not found'));

		await expect(execute()).rejects.toThrow(
			"Couldn't send the approval request to 'Legal' (Telegram): chat not found",
		);
	});

	describe('fails before it sends anything', () => {
		afterEach(() => {
			expect(sendMail).not.toHaveBeenCalled();
			expect(context.putExecutionToWait).not.toHaveBeenCalled();
		});

		it('without approvers', async () => {
			parameters['approvers.approver'] = [];

			await expect(execute()).rejects.toThrow('Add at least one approver');
		});

		it('when more approvals are required than there are approvers', async () => {
			parameters.approvalsRequired = 'custom';
			parameters.customRequired = 4;

			await expect(execute()).rejects.toThrow('Approvals required must be between 1 and 3');
		});

		it('when an approver uses a channel that is not in Channels', async () => {
			parameters.channels = ['email', 'slack'];

			await expect(execute()).rejects.toThrow("'Legal' uses Telegram, which is not in Channels");
		});

		it('when an approver has no recipient', async () => {
			parameters['approvers.approver'] = [{ label: 'Legal', channel: 'telegram', chatId: ' ' }];

			await expect(execute()).rejects.toThrow("'Legal' has no recipient");
		});

		it('when a channel in use has no credential', async () => {
			context.getCredentials.mockImplementation(async (type: string) => {
				if (type === 'telegramApi') throw new Error('missing');
				return {};
			});

			await expect(execute()).rejects.toThrow("Add a Telegram credential. 'Legal' uses Telegram.");
		});
	});
});
