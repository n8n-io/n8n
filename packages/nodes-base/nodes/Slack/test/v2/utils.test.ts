import { type MockProxy, mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { getTarget, createSendAndWaitMessageBody } from '../../V2/GenericFunctions';
import { parseSlackTimestamp } from '../../V2/utils';

describe('parseSlackTimestamp', () => {
	it('should return Slack timestamp as-is when it is a numeric string', () => {
		expect(parseSlackTimestamp('1663233118.856619')).toBe('1663233118.856619');
	});

	it('should return integer timestamp as-is when it is a numeric string', () => {
		expect(parseSlackTimestamp('1663233118')).toBe('1663233118');
	});

	it('should convert ISO date string to Unix timestamp', () => {
		const isoDate = '2024-01-15T10:30:00.000Z';
		const expectedTimestamp = new Date(isoDate).getTime() / 1000;
		expect(parseSlackTimestamp(isoDate)).toBe(expectedTimestamp);
	});

	it('should convert date-only string to Unix timestamp', () => {
		const dateString = '2024-01-15';
		const expectedTimestamp = new Date(dateString).getTime() / 1000;
		expect(parseSlackTimestamp(dateString)).toBe(expectedTimestamp);
	});

	it('should return original value for invalid date strings', () => {
		expect(parseSlackTimestamp('invalid-date')).toBe('invalid-date');
	});
});

describe('Slack Utility Functions', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue({ name: 'Slack', typeVersion: 1 } as any);
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValueOnce(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValueOnce(
			'http://localhost/waiting-webhook/nodeID?approved=false&signature=abc',
		);
		jest.clearAllMocks();
	});

	describe('getTarget', () => {
		it('should return correct target id', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				if (parameterName === 'user') {
					return 'testUser';
				}
				return 'testChannel';
			});
			expect(getTarget(mockExecuteFunctions, 0, 'channel')).toEqual('testChannel');

			expect(getTarget(mockExecuteFunctions, 0, 'user')).toEqual('testUser');
		});
	});

	describe('createSendAndWaitMessageBody', () => {
		it('should create message with single button - pre 2.3 plain_text', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channel');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channelID');

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('subject');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});

			expect(createSendAndWaitMessageBody(mockExecuteFunctions)).toEqual({
				blocks: [
					{
						type: 'divider',
					},
					{
						text: {
							emoji: true,
							text: 'message',
							type: 'plain_text',
						},
						type: 'section',
					},
					{
						text: {
							text: ' ',
							type: 'plain_text',
						},
						type: 'section',
					},
					{
						type: 'divider',
					},
					{
						elements: [
							{
								style: 'primary',
								text: {
									emoji: true,
									text: 'Approve',
									type: 'plain_text',
								},
								type: 'button',
								url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
							},
						],
						type: 'actions',
					},
				],
				channel: 'channelID',
			});
		});

		it('should create message with double buttons - pre 2.3 plain_text', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channel');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channelID');

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('subject');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ approvalType: 'double' });

			expect(createSendAndWaitMessageBody(mockExecuteFunctions)).toEqual({
				blocks: [
					{
						type: 'divider',
					},
					{
						text: {
							emoji: true,
							text: 'message',
							type: 'plain_text',
						},
						type: 'section',
					},
					{
						text: {
							text: ' ',
							type: 'plain_text',
						},
						type: 'section',
					},
					{
						type: 'divider',
					},
					{
						elements: [
							{
								style: undefined,
								text: {
									emoji: true,
									text: 'Disapprove',
									type: 'plain_text',
								},
								type: 'button',
								url: 'http://localhost/waiting-webhook/nodeID?approved=false&signature=abc',
							},

							{
								style: 'primary',
								text: {
									emoji: true,
									text: 'Approve',
									type: 'plain_text',
								},
								type: 'button',
								url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
							},
						],
						type: 'actions',
					},
				],
				channel: 'channelID',
			});
		});

		it('should create message with single button - 2.3+ mrkdwn', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channel');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channelID');

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('subject');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Slack', typeVersion: 2.3 } as any);

			expect(createSendAndWaitMessageBody(mockExecuteFunctions)).toEqual({
				blocks: [
					{
						type: 'divider',
					},
					{
						text: {
							text: 'message',
							type: 'mrkdwn',
						},
						type: 'section',
					},
					{
						text: {
							text: ' ',
							type: 'plain_text',
						},
						type: 'section',
					},
					{
						type: 'divider',
					},
					{
						elements: [
							{
								style: 'primary',
								text: {
									emoji: true,
									text: 'Approve',
									type: 'plain_text',
								},
								type: 'button',
								url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
							},
						],
						type: 'actions',
					},
				],
				channel: 'channelID',
			});
		});

		it('should create message with double buttons - 2.3+ mrkdwn', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channel');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('channelID');

			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('subject');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({ approvalType: 'double' });

			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Slack', typeVersion: 2.3 } as any);

			expect(createSendAndWaitMessageBody(mockExecuteFunctions)).toEqual({
				blocks: [
					{
						type: 'divider',
					},
					{
						text: {
							text: 'message',
							type: 'mrkdwn',
						},
						type: 'section',
					},
					{
						text: {
							text: ' ',
							type: 'plain_text',
						},
						type: 'section',
					},
					{
						type: 'divider',
					},
					{
						elements: [
							{
								style: undefined,
								text: {
									emoji: true,
									text: 'Disapprove',
									type: 'plain_text',
								},
								type: 'button',
								url: 'http://localhost/waiting-webhook/nodeID?approved=false&signature=abc',
							},

							{
								style: 'primary',
								text: {
									emoji: true,
									text: 'Approve',
									type: 'plain_text',
								},
								type: 'button',
								url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
							},
						],
						type: 'actions',
					},
				],
				channel: 'channelID',
			});
		});
	});
});
