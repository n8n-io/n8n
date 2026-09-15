import { Container } from '@n8n/di';
import { buildHitlCallbackReference, InstanceSettings } from 'n8n-core';
import { type INode, SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import * as GenericFunctions from '../../../../V2/GenericFunctions';
import { HITL_APPROVE_ACTION_ID, HITL_DECLINE_ACTION_ID } from '../../../../V2/MessageInterface';
import { SlackV2 } from '../../../../V2/SlackV2.node';

const TEST_HMAC_SECRET = 'test-hmac-secret';
// The button builder derives the callback reference from the instance HMAC secret.
Container.set(InstanceSettings, { hmacSignatureSecret: TEST_HMAC_SECRET } as InstanceSettings);

describe('Test SlackV2, message => sendAndWait', () => {
	let slack: SlackV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let slackApiRequestSpy: MockInstance;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.3,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		slack = new SlackV2({
			name: 'Slack',
			displayName: 'Slack',
			description: 'Slack node',
			group: ['output'],
		});
		mockExecuteFunctions = mock<IExecuteFunctions>();
		slackApiRequestSpy = vi.spyOn(GenericFunctions, 'slackApiRequest');

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getExecutionId.mockReturnValue('exec-1');
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { data: 'test' } }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.putExecutionToWait.mockImplementation(async () => {});
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&token=abc',
		);

		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'authentication') return 'accessToken';
			if (key === 'resource') return 'message';
			if (key === 'operation') return SEND_AND_WAIT_OPERATION;
			if (key === 'select') return 'channel';
			if (key === 'channelId') return 'C123456789';
			if (key === 'message') return 'test message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'options') return {};
			if (key === 'options.limitWaitTime.values') return {};
			if (key === 'responseType') return 'approval';
			return undefined;
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		slackApiRequestSpy.mockResolvedValue({ ok: true });

		const result = await slack.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { data: 'test' } }]]);
		expect(slackApiRequestSpy).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(slackApiRequestSpy).toHaveBeenCalledWith('POST', '/chat.postMessage', {
			channel: 'C123456789',
			blocks: [
				{ type: 'divider' },
				{
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: 'test message',
					},
				},
				{
					type: 'section',
					text: { type: 'plain_text', text: ' ' },
				},
				{ type: 'divider' },
				{
					type: 'actions',
					elements: [
						{
							type: 'button',
							style: 'primary',
							text: { type: 'plain_text', text: 'Approve', emoji: true },
							url: 'http://localhost/waiting-webhook/nodeID?approved=true&token=abc',
						},
					],
				},
			],
		});
	});

	it('should render interactive buttons carrying the HMAC callback reference when capturing the responder', async () => {
		slackApiRequestSpy.mockResolvedValue({ ok: true });
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'authentication') return 'accessToken';
			if (key === 'resource') return 'message';
			if (key === 'operation') return SEND_AND_WAIT_OPERATION;
			if (key === 'select') return 'channel';
			if (key === 'channelId') return 'C123456789';
			if (key === 'message') return 'test message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return {};
			if (key === 'options') return {};
			if (key === 'options.limitWaitTime.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'captureResponder') return true;
			return undefined;
		});

		await slack.execute.call(mockExecuteFunctions);

		const body = slackApiRequestSpy.mock.calls[0][2];
		const actionsBlock = body.blocks.find(
			(block: { type: string }) => block.type === 'actions',
		) as { elements: Array<{ url?: string; action_id?: string; value?: string }> };
		const [approveButton] = actionsBlock.elements;

		expect(approveButton.url).toBeUndefined();
		expect(approveButton.action_id).toBe(HITL_APPROVE_ACTION_ID);
		// The approve button carries a decision-'a' reference for this execution.
		expect(approveButton.value).toBe(buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET));
	});

	it('assigns the decline action_id to the disapprove button when capturing the responder', async () => {
		slackApiRequestSpy.mockResolvedValue({ ok: true });
		mockExecuteFunctions.getNodeParameter.mockImplementation((key: string) => {
			if (key === 'authentication') return 'accessToken';
			if (key === 'resource') return 'message';
			if (key === 'operation') return SEND_AND_WAIT_OPERATION;
			if (key === 'select') return 'channel';
			if (key === 'channelId') return 'C123456789';
			if (key === 'message') return 'test message';
			if (key === 'subject') return '';
			if (key === 'approvalOptions.values') return { approvalType: 'double' };
			if (key === 'options') return {};
			if (key === 'options.limitWaitTime.values') return {};
			if (key === 'responseType') return 'approval';
			if (key === 'captureResponder') return true;
			return undefined;
		});

		await slack.execute.call(mockExecuteFunctions);

		const body = slackApiRequestSpy.mock.calls[0][2];
		const actionsBlock = body.blocks.find(
			(block: { type: string }) => block.type === 'actions',
		) as { elements: Array<{ action_id?: string; value?: string }> };
		// getSendAndWaitConfig pushes the disapprove option first, then approve.
		const [declineButton, approveButton] = actionsBlock.elements;

		expect(declineButton.action_id).toBe(HITL_DECLINE_ACTION_ID);
		expect(approveButton.action_id).toBe(HITL_APPROVE_ACTION_ID);
		// Each button carries the matching decision in its reference.
		expect(declineButton.value).toBe(buildHitlCallbackReference('exec-1', 'd', TEST_HMAC_SECRET));
		expect(approveButton.value).toBe(buildHitlCallbackReference('exec-1', 'a', TEST_HMAC_SECRET));
	});

	it('should route API errors to error output when continueOnFail is true', async () => {
		slackApiRequestSpy.mockRejectedValueOnce(new Error('channel_not_found'));
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		const result = await slack.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { error: 'channel_not_found' } }]]);
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('should throw error when continueOnFail is false', async () => {
		slackApiRequestSpy.mockRejectedValueOnce(new Error('channel_not_found'));

		await expect(slack.execute.call(mockExecuteFunctions)).rejects.toThrow('channel_not_found');
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});
});
