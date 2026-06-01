import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type INode, SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import { SlackV2 } from '../../../../V2/SlackV2.node';
import * as GenericFunctions from '../../../../V2/GenericFunctions';

describe('Test SlackV2, message => sendAndWait', () => {
	let slack: SlackV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let slackApiRequestSpy: jest.SpyInstance;

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
		slackApiRequestSpy = jest.spyOn(GenericFunctions, 'slackApiRequest');

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
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
		jest.clearAllMocks();
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
