import type { IExecuteFunctions, IWebhookFunctions } from 'n8n-workflow';
import { type MockProxy, mock } from 'vitest-mock-extended';

import { verifySignature } from '../../SlackTriggerHelpers';
import {
	getTarget,
	createSendAndWaitMessageBody,
	toMultiOptionsCsv,
} from '../../V2/GenericFunctions';
import { slackSendAndWaitWebhook } from '../../V2/SlackHitlWebhook';

vi.mock('../../SlackTriggerHelpers', () => ({ verifySignature: vi.fn() }));

describe('slackSendAndWaitWebhook', () => {
	let webhookFns: MockProxy<IWebhookFunctions>;

	beforeEach(() => {
		webhookFns = mock<IWebhookFunctions>();
		webhookFns.getCredentials.mockResolvedValue({ signatureSecret: 'shhh' } as any);
		vi.mocked(verifySignature).mockReset();
	});

	it('returns approved + responder for a valid Slack interaction', async () => {
		vi.mocked(verifySignature).mockResolvedValue(true);
		webhookFns.getRequestObject.mockReturnValue({
			method: 'POST',
			headers: { 'x-slack-signature': 'v0=abc' },
		} as any);
		webhookFns.getBodyData.mockReturnValue({
			actions: [{ action_id: 'n8n_hitl_approve' }],
			user: { id: 'U1', name: 'Ada' },
		} as any);

		const result = await slackSendAndWaitWebhook.call(webhookFns);

		// users.info fails under the mock, so email is degraded out (id + name only).
		expect(result).toEqual({
			webhookResponse: '',
			workflowData: [
				[
					{
						json: {
							data: { approved: true, responder: { id: 'U1', name: 'Ada', source: 'slack' } },
						},
					},
				],
			],
		});
	});

	it('refuses with 401 and no resume when the Slack signature is invalid', async () => {
		vi.mocked(verifySignature).mockResolvedValue(false);
		const status = vi.fn().mockReturnThis();
		const send = vi.fn();
		webhookFns.getRequestObject.mockReturnValue({
			method: 'POST',
			headers: { 'x-slack-signature': 'v0=bad' },
		} as any);
		webhookFns.getResponseObject.mockReturnValue({ status, send } as any);

		const result = await slackSendAndWaitWebhook.call(webhookFns);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('treats an explicit decline action as not approved (fail closed)', async () => {
		vi.mocked(verifySignature).mockResolvedValue(true);
		webhookFns.getRequestObject.mockReturnValue({
			method: 'POST',
			headers: { 'x-slack-signature': 'v0=abc' },
		} as any);
		webhookFns.getBodyData.mockReturnValue({
			actions: [{ action_id: 'n8n_hitl_decline' }],
			user: { id: 'U1' },
		} as any);

		const result = await slackSendAndWaitWebhook.call(webhookFns);

		expect((result as any).workflowData[0][0].json.data.approved).toBe(false);
	});

	it('refuses (no resume, verify not attempted) when no signing secret is configured', async () => {
		vi.mocked(verifySignature).mockResolvedValue(true);
		webhookFns.getCredentials.mockResolvedValue({} as any);
		const status = vi.fn().mockReturnThis();
		webhookFns.getRequestObject.mockReturnValue({
			method: 'POST',
			headers: { 'x-slack-signature': 'v0=abc' },
		} as any);
		webhookFns.getResponseObject.mockReturnValue({ status, send: vi.fn() } as any);

		const result = await slackSendAndWaitWebhook.call(webhookFns);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(verifySignature).not.toHaveBeenCalled();
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

		it('uses interactive buttons (action_id + value, no url) when captureResponder is enabled', () => {
			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'Slack',
				id: 'node-1',
				typeVersion: 2.3,
			} as any);
			mockExecuteFunctions.getExecutionId.mockReturnValue('exec-1');
			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
				'http://localhost/waiting-webhook/exec-1/node-1?approved=true&signature=abc',
			);
			mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
				const params: Record<string, any> = {
					select: 'channel',
					channelId: 'channelID',
					message: 'message',
					subject: 'subject',
					'approvalOptions.values': {},
					responseType: 'approval',
					captureResponder: true,
					options: {},
				};
				return params[name];
			});

			const body = createSendAndWaitMessageBody(mockExecuteFunctions);
			const actions = body.blocks.find((b) => b.type === 'actions') as { elements: any[] };

			expect(actions.elements).toHaveLength(1);
			expect(actions.elements[0]).toMatchObject({
				type: 'button',
				action_id: 'n8n_hitl_approve',
				value: JSON.stringify({ executionId: 'exec-1', nodeId: 'node-1' }),
			});
			// Interactive buttons must not carry a url (that would render a plain link button).
			expect(actions.elements[0].url).toBeUndefined();
		});

		it('ignores captureResponder for non-approval response types (keeps the link button)', () => {
			mockExecuteFunctions.getNode.mockReturnValue({
				name: 'Slack',
				id: 'node-1',
				typeVersion: 2.3,
			} as any);
			mockExecuteFunctions.getExecutionId.mockReturnValue('exec-1');
			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
				'http://localhost/waiting-webhook/exec-1/node-1?approved=true&signature=abc',
			);
			mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
				const params: Record<string, any> = {
					select: 'channel',
					channelId: 'channelID',
					message: 'message',
					subject: 'subject',
					'approvalOptions.values': {},
					responseType: 'freeText',
					captureResponder: true,
					options: {},
				};
				return params[name];
			});

			const body = createSendAndWaitMessageBody(mockExecuteFunctions);
			const actions = body.blocks.find((b) => b.type === 'actions') as { elements: any[] };

			// Free Text must keep the plain link button so the form can be opened.
			expect(actions.elements[0].url).toBeDefined();
			expect(actions.elements[0].action_id).toBeUndefined();
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
