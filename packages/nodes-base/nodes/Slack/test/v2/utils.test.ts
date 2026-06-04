import { type MockProxy, mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import {
	getTarget,
	createSendAndWaitMessageBody,
	toMultiOptionsCsv,
} from '../../V2/GenericFunctions';

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
		vi.clearAllMocks();
	});

	describe('toMultiOptionsCsv', () => {
		it('joins array values', () => {
			expect(toMultiOptionsCsv(['U123', 'U456'])).toBe('U123,U456');
		});

		it('trims entries inside an array (interpolated array elements)', () => {
			expect(toMultiOptionsCsv(['U123 ', ' U456'])).toBe('U123,U456');
		});

		it('drops empty array entries', () => {
			expect(toMultiOptionsCsv(['U123', '', '  ', 'U456'])).toBe('U123,U456');
		});

		it('coerces non-string array entries via String()', () => {
			expect(toMultiOptionsCsv([1, 2, 3])).toBe('1,2,3');
		});

		it('accepts a comma-joined string (the whitespace-expression coercion case)', () => {
			expect(toMultiOptionsCsv('U123,U456')).toBe('U123,U456');
		});

		it('trims surrounding whitespace on a string value (trailing-space expression bug)', () => {
			expect(toMultiOptionsCsv('U123,U456 ')).toBe('U123,U456');
		});

		it('trims whitespace around each entry in a comma-string', () => {
			expect(toMultiOptionsCsv(' U123 , U456 ')).toBe('U123,U456');
		});

		it('returns empty string for undefined/null/empty', () => {
			expect(toMultiOptionsCsv(undefined)).toBe('');
			expect(toMultiOptionsCsv(null)).toBe('');
			expect(toMultiOptionsCsv('')).toBe('');
			expect(toMultiOptionsCsv([])).toBe('');
		});
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
