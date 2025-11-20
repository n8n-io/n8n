import { type MockProxy, mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { createSendAndWaitMessageBody } from '../GenericFunctions';

describe('Slack V2 GenericFunctions', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.3 } as INode);
		mockExecuteFunctions.getInstanceId.mockReturnValue('test-instance-id');
	});

	describe('createSendAndWaitMessageBody', () => {
		it('should create message body without thread_ts', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(parameterName, _itemIndex, _fallbackValue, options) => {
					if (options?.extractValue) {
						// Handle extractValue option for channelId
						return 'C12345';
					}

					const params: Record<string, string | object> = {
						select: 'channel',
						channelId: { value: 'C12345' },
						message: 'Test message',
						subject: 'Test subject',
						responseType: 'approval',
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'approvalOptions.values': {
							approvalType: 'single',
							approveLabel: 'Approve',
							buttonApprovalStyle: 'primary',
						},
						options: {},
					};
					return params[parameterName];
				},
			);

			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/test');

			const body = createSendAndWaitMessageBody(mockExecuteFunctions);

			expect(body).toEqual(
				expect.objectContaining({
					channel: 'C12345',
					blocks: expect.any(Array),
				}),
			);
			expect(body).not.toHaveProperty('thread_ts');
			expect(body).not.toHaveProperty('reply_broadcast');
		});

		it('should create message body with thread_ts', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(parameterName, _itemIndex, _fallbackValue, options) => {
					if (options?.extractValue) {
						return 'C12345';
					}

					const params: Record<string, string | object> = {
						select: 'channel',
						channelId: { value: 'C12345' },
						message: 'Test message',
						subject: 'Test subject',
						responseType: 'approval',
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'approvalOptions.values': {
							approvalType: 'single',
							approveLabel: 'Approve',
							buttonApprovalStyle: 'primary',
						},
						options: {
							thread_ts: {
								replyValues: {
									thread_ts: 1663233118.856619,
								},
							},
						},
					};
					return params[parameterName];
				},
			);

			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/test');

			const body = createSendAndWaitMessageBody(mockExecuteFunctions);

			expect(body).toEqual(
				expect.objectContaining({
					channel: 'C12345',
					blocks: expect.any(Array),
					thread_ts: 1663233118.856619,
				}),
			);
			expect(body).not.toHaveProperty('reply_broadcast');
		});

		it('should create message body with thread_ts and reply_broadcast', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(parameterName, _itemIndex, _fallbackValue, options) => {
					if (options?.extractValue) {
						return 'C12345';
					}

					const params: Record<string, string | object> = {
						select: 'channel',
						channelId: { value: 'C12345' },
						message: 'Test message',
						subject: 'Test subject',
						responseType: 'approval',
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'approvalOptions.values': {
							approvalType: 'single',
							approveLabel: 'Approve',
							buttonApprovalStyle: 'primary',
						},
						options: {
							thread_ts: {
								replyValues: {
									thread_ts: 1663233118.856619,
									reply_broadcast: true,
								},
							},
						},
					};
					return params[parameterName];
				},
			);

			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/test');

			const body = createSendAndWaitMessageBody(mockExecuteFunctions);

			expect(body).toEqual(
				expect.objectContaining({
					channel: 'C12345',
					blocks: expect.any(Array),
					thread_ts: 1663233118.856619,
					reply_broadcast: true,
				}),
			);
		});

		it('should select user target correctly', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(parameterName, _itemIndex, _fallbackValue, options) => {
					if (options?.extractValue) {
						return 'U12345';
					}

					const params: Record<string, string | object> = {
						select: 'user',
						user: { value: 'U12345' },
						message: 'Test message',
						subject: 'Test subject',
						responseType: 'approval',
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'approvalOptions.values': {
							approvalType: 'single',
							approveLabel: 'Approve',
							buttonApprovalStyle: 'primary',
						},
						options: {},
					};
					return params[parameterName];
				},
			);

			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/test');

			const body = createSendAndWaitMessageBody(mockExecuteFunctions);

			expect(body).toEqual(
				expect.objectContaining({
					channel: 'U12345',
					blocks: expect.any(Array),
				}),
			);
		});
	});
});
