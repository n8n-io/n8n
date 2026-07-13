import type { IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as sendAndWaitUtils from '../../../../../utils/sendAndWait/utils';
import * as SlackTriggerHelpers from '../../../SlackTriggerHelpers';
import * as GenericFunctions from '../../../V2/GenericFunctions';
import { slackSendAndWaitWebhook } from '../../../V2/SlackHitlWebhook';

vi.mock('../../../V2/GenericFunctions', () => ({ slackApiRequest: vi.fn() }));
vi.mock('../../../SlackTriggerHelpers', () => ({ verifySignature: vi.fn() }));
vi.mock('../../../../../utils/sendAndWait/utils', () => ({ sendAndWaitWebhook: vi.fn() }));

const slackApiRequest = vi.mocked(GenericFunctions.slackApiRequest);
const verifySignature = vi.mocked(SlackTriggerHelpers.verifySignature);
const sendAndWaitWebhook = vi.mocked(sendAndWaitUtils.sendAndWaitWebhook);

interface ContextOptions {
	method?: string;
	hasSignature?: boolean;
	signatureSecret?: string;
	payload?: Record<string, unknown>;
	approvers?: string[];
	authentication?: string;
}

function createContext(opts: ContextOptions) {
	const ctx = mock<IWebhookFunctions>();
	ctx.getRequestObject.mockReturnValue({
		method: opts.method ?? 'POST',
		headers: opts.hasSignature ? { 'x-slack-signature': 'v0=abc' } : {},
	} as unknown as ReturnType<IWebhookFunctions['getRequestObject']>);

	const status = vi.fn().mockReturnThis();
	const send = vi.fn().mockReturnThis();
	ctx.getResponseObject.mockReturnValue({
		status,
		send,
	} as unknown as ReturnType<IWebhookFunctions['getResponseObject']>);

	ctx.getCredentials.mockResolvedValue({ signatureSecret: opts.signatureSecret });
	ctx.getBodyData.mockReturnValue({ payload: JSON.stringify(opts.payload ?? {}) });
	ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
		if (name === 'approvers') return (opts.approvers ?? []) as never;
		if (name === 'authentication') return (opts.authentication ?? fallback) as never;
		return fallback as never;
	});

	const httpRequest = vi.fn();
	ctx.helpers = { httpRequest } as unknown as IWebhookFunctions['helpers'];
	ctx.logger = {
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	} as unknown as IWebhookFunctions['logger'];

	return { ctx, status, send, httpRequest };
}

describe('slackSendAndWaitWebhook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to the shared handler for non-interaction requests', async () => {
		const { ctx } = createContext({ method: 'GET', hasSignature: false });
		sendAndWaitWebhook.mockResolvedValue({ noWebhookResponse: true });

		await slackSendAndWaitWebhook.call(ctx);

		expect(sendAndWaitWebhook).toHaveBeenCalledTimes(1);
		expect(ctx.getCredentials).not.toHaveBeenCalled();
	});

	it('delegates a POST without an x-slack-signature header to the shared handler', async () => {
		// The header-only gate: an unsigned POST is either HMAC-validated by the base route or
		// rejected at the `-slack` CLI layer, so it must never be treated as a Slack interaction
		// (which would force it through signature verification). A custom-form field named
		// `payload` must not change this.
		const { ctx } = createContext({
			method: 'POST',
			hasSignature: false,
			payload: { payload: 'a user-defined form field' },
		});
		sendAndWaitWebhook.mockResolvedValue({ noWebhookResponse: true });

		await slackSendAndWaitWebhook.call(ctx);

		expect(sendAndWaitWebhook).toHaveBeenCalledTimes(1);
		expect(ctx.getCredentials).not.toHaveBeenCalled();
	});

	it('responds 401 without resuming when no signing secret is configured', async () => {
		const { ctx, status } = createContext({ hasSignature: true, signatureSecret: undefined });
		verifySignature.mockResolvedValue(true);

		const result = await slackSendAndWaitWebhook.call(ctx);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('responds 401 without resuming when the signature is invalid', async () => {
		const { ctx, status } = createContext({ hasSignature: true, signatureSecret: 'secret' });
		verifySignature.mockResolvedValue(false);

		const result = await slackSendAndWaitWebhook.call(ctx);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('resumes with the responder, channel and message id, and locks the message via response_url', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1', name: 'alice' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: {
					ts: '111.222',
					blocks: [
						{ type: 'section', text: { type: 'mrkdwn', text: 'Please approve this request' } },
						{ type: 'actions', elements: [{ type: 'button' }] },
					],
				},
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: { email: 'alice@example.com' } } });
		httpRequest.mockResolvedValue({});

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<Array<{ json: { data: Record<string, unknown> } }>>;
		};

		expect(result.workflowData[0][0].json.data).toEqual({
			approved: true,
			responder: { id: 'U1', name: 'alice', email: 'alice@example.com', source: 'slack' },
			respondedAt: '2023-11-14T22:13:20.000Z',
			channel: 'C1',
			messageId: '111.222',
		});
		// A verified interaction resumes directly and never reaches the unauthenticated handler.
		expect(sendAndWaitWebhook).not.toHaveBeenCalled();
		// Message locked via response_url, with the buttons removed. Body is a JSON string
		// (Slack replies with plain "ok", so we don't parse the response as JSON).
		expect(httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				url: 'https://hooks.slack.com/actions/xxx',
				body: expect.stringContaining('"replace_original":true'),
			}),
		);
		// The original message is preserved and only the actions block is dropped.
		const lockBody = httpRequest.mock.calls[0][0].body as string;
		expect(lockBody).toContain('Please approve this request');
		expect(lockBody).not.toContain('"type":"actions"');
		expect(lockBody).toContain('Approved');
	});

	it('verifies against the OAuth2 credential when the node uses OAuth2 auth', async () => {
		const { ctx } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			authentication: 'oAuth2',
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });

		await slackSendAndWaitWebhook.call(ctx);

		expect(ctx.getCredentials).toHaveBeenCalledWith('slackOAuth2Api');
		expect(verifySignature).toHaveBeenCalledWith('slackOAuth2Api');
	});

	it('treats a decline action as not approved', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: 'n8n_hitl_decline', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });
		httpRequest.mockResolvedValue({});

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<Array<{ json: { data: { approved: boolean } } }>>;
		};

		expect(result.workflowData[0][0].json.data.approved).toBe(false);
	});

	it('ignores a click from someone not on the approver list and notifies them privately', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			approvers: ['U_ALLOWED'],
			payload: {
				user: { id: 'U_OTHER' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ ok: true });

		const result = await slackSendAndWaitWebhook.call(ctx);

		// Execution stays waiting: no workflowData returned, and the message is not locked.
		expect(result).toEqual({ noWebhookResponse: true });
		expect(httpRequest).not.toHaveBeenCalled();
		expect(slackApiRequest).toHaveBeenCalledWith(
			'POST',
			'/chat.postEphemeral',
			expect.objectContaining({ channel: 'C1', user: 'U_OTHER' }),
		);
	});

	it('resumes when the responder is on the approver list', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			approvers: ['U1'],
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });
		httpRequest.mockResolvedValue({});

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<Array<{ json: { data: { approved: boolean } } }>>;
		};

		expect(result.workflowData[0][0].json.data.approved).toBe(true);
	});

	it('falls back to chat.update when response_url fails', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockImplementation(async (_method, resource) => {
			if (resource === '/users.info') return { user: { profile: {} } };
			return { ok: true };
		});
		httpRequest.mockRejectedValue(new Error('response_url expired'));

		await slackSendAndWaitWebhook.call(ctx);

		expect(slackApiRequest).toHaveBeenCalledWith(
			'POST',
			'/chat.update',
			expect.objectContaining({ channel: 'C1', ts: '111.222' }),
		);
	});

	it('resolves as not approved for an unknown action_id and still resumes', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: 'something_else', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });
		httpRequest.mockResolvedValue({});

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<Array<{ json: { data: { approved: boolean } } }>>;
		};

		expect(result.workflowData[0][0].json.data.approved).toBe(false);
	});

	it('resolves as not approved when the interaction carries no actions and still resumes', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });
		httpRequest.mockResolvedValue({});

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<Array<{ json: { data: { approved: boolean } } }>>;
		};

		expect(result.workflowData[0][0].json.data.approved).toBe(false);
	});

	it('still resumes when both response_url and chat.update fail to lock the message', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		httpRequest.mockRejectedValue(new Error('response_url expired'));
		slackApiRequest.mockImplementation(async (_method, resource) => {
			if (resource === '/users.info') return { user: { profile: {} } };
			throw new Error('missing chat:write scope');
		});

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<Array<{ json: { data: { approved: boolean } } }>>;
		};

		expect(result.workflowData[0][0].json.data.approved).toBe(true);
	});

	it('still resumes when the message cannot be locked because channel and ts are missing', async () => {
		const { ctx } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<Array<{ json: { data: { approved: boolean } } }>>;
		};

		expect(result.workflowData[0][0].json.data.approved).toBe(true);
	});

	it('resumes with id and name but no email when users.info fails', async () => {
		const { ctx, httpRequest } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1', name: 'alice' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		httpRequest.mockResolvedValue({});
		slackApiRequest.mockRejectedValue(new Error('missing users:read.email scope'));

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<
				Array<{ json: { data: { responder: { id: string; name?: string; source: string } } } }>
			>;
		};

		expect(result.workflowData[0][0].json.data.responder).toEqual({
			id: 'U1',
			name: 'alice',
			source: 'slack',
		});
	});

	it('keeps waiting when notifying an unauthorized responder fails', async () => {
		const { ctx } = createContext({
			hasSignature: true,
			signatureSecret: 'secret',
			approvers: ['U_ALLOWED'],
			payload: {
				user: { id: 'U_OTHER' },
				actions: [{ action_id: 'n8n_hitl_approve', action_ts: '1700000000.000' }],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockRejectedValue(new Error('missing chat:write scope'));

		const result = await slackSendAndWaitWebhook.call(ctx);

		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('falls back to the receive time for respondedAt when action_ts is invalid', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-02T03:04:05.000Z'));
		try {
			const { ctx, httpRequest } = createContext({
				hasSignature: true,
				signatureSecret: 'secret',
				payload: {
					user: { id: 'U1' },
					actions: [{ action_id: 'n8n_hitl_approve', action_ts: 'not-a-number' }],
					channel: { id: 'C1' },
					message: { ts: '111.222' },
					response_url: 'https://hooks.slack.com/actions/xxx',
				},
			});
			verifySignature.mockResolvedValue(true);
			slackApiRequest.mockResolvedValue({ user: { profile: {} } });
			httpRequest.mockResolvedValue({});

			const result = (await slackSendAndWaitWebhook.call(ctx)) as {
				workflowData: Array<Array<{ json: { data: { respondedAt: string } } }>>;
			};

			expect(result.workflowData[0][0].json.data.respondedAt).toBe('2024-01-02T03:04:05.000Z');
		} finally {
			vi.useRealTimers();
		}
	});
});
