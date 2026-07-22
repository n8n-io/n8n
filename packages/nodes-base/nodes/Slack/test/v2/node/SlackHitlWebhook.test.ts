import { buildHitlCallbackReference, markSlackInteractionRequest } from 'n8n-core';
import type { IWebhookFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as sendAndWaitUtils from '../../../../../utils/sendAndWait/utils';
import * as SlackTriggerHelpers from '../../../SlackTriggerHelpers';
import * as GenericFunctions from '../../../V2/GenericFunctions';
import { HITL_APPROVE_ACTION_ID, HITL_DECLINE_ACTION_ID } from '../../../V2/MessageInterface';
import { slackSendAndWaitWebhook } from '../../../V2/SlackHitlWebhook';

vi.mock('../../../V2/GenericFunctions', () => ({ slackApiRequest: vi.fn() }));
vi.mock('../../../SlackTriggerHelpers', () => ({ verifySignature: vi.fn() }));
vi.mock('../../../../../utils/sendAndWait/utils', () => ({ sendAndWaitWebhook: vi.fn() }));

const slackApiRequest = vi.mocked(GenericFunctions.slackApiRequest);
const verifySignature = vi.mocked(SlackTriggerHelpers.verifySignature);
const sendAndWaitWebhook = vi.mocked(sendAndWaitUtils.sendAndWaitWebhook);

// The button `value` now carries the shared HITL callback reference (executionId|decision|hmac).
// The node only parses it for the decision (parseHitlCallbackReference does no HMAC check — the
// HMAC is verified at the CLI layer), so any secret produces a well-formed reference here.
const APPROVE_VALUE = buildHitlCallbackReference('e1', 'a', 'ref-secret');
const DECLINE_VALUE = buildHitlCallbackReference('e1', 'd', 'ref-secret');

interface ContextOptions {
	method?: string;
	// Whether the request arrived via the `-slack` interaction route (the CLI flags such requests
	// via markSlackInteractionRequest). This — not the x-slack-signature header — is what makes
	// the node treat it as a Slack interaction that must be signature-verified.
	interaction?: boolean;
	signatureSecret?: string;
	payload?: Record<string, unknown>;
	approvers?: string[];
	authentication?: string;
}

function createContext(opts: ContextOptions) {
	const ctx = mock<IWebhookFunctions>();
	const req = {
		method: opts.method ?? 'POST',
		headers: {},
	} as unknown as ReturnType<IWebhookFunctions['getRequestObject']>;
	if (opts.interaction) markSlackInteractionRequest(req);
	ctx.getRequestObject.mockReturnValue(req);

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
		const { ctx } = createContext({ method: 'GET', interaction: false });
		sendAndWaitWebhook.mockResolvedValue({ noWebhookResponse: true });

		await slackSendAndWaitWebhook.call(ctx);

		expect(sendAndWaitWebhook).toHaveBeenCalledTimes(1);
		expect(ctx.getCredentials).not.toHaveBeenCalled();
	});

	it('delegates a POST not flagged as an interaction to the shared handler', async () => {
		// A request that did not arrive via the `-slack` interaction route (unflagged) belongs to
		// the shared handler, which authenticates it with the signed resume URL. It must never be
		// treated as a Slack interaction — a custom-form field named `payload` must not change this.
		const { ctx } = createContext({
			method: 'POST',
			interaction: false,
			payload: { payload: 'a user-defined form field' },
		});
		sendAndWaitWebhook.mockResolvedValue({ noWebhookResponse: true });

		await slackSendAndWaitWebhook.call(ctx);

		expect(sendAndWaitWebhook).toHaveBeenCalledTimes(1);
		expect(ctx.getCredentials).not.toHaveBeenCalled();
	});

	it('responds 401 without resuming when no signing secret is configured', async () => {
		const { ctx, status } = createContext({ interaction: true, signatureSecret: undefined });
		verifySignature.mockResolvedValue(true);

		const result = await slackSendAndWaitWebhook.call(ctx);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
		// Must not fall back to the query-param approval path.
		expect(sendAndWaitWebhook).not.toHaveBeenCalled();
	});

	it('responds 401 without resuming when the signature is invalid', async () => {
		const { ctx, status } = createContext({ interaction: true, signatureSecret: 'secret' });
		verifySignature.mockResolvedValue(false);

		const result = await slackSendAndWaitWebhook.call(ctx);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
		// Must not fall back to the query-param approval path.
		expect(sendAndWaitWebhook).not.toHaveBeenCalled();
	});

	it('rejects an unsigned interaction-route POST with 401 instead of resuming as approved', async () => {
		// An interaction-route request with no signature at all (verifySignature never even called
		// because there is no secret) must fail closed, not fall through to the shared handler
		// where an attacker-controlled `?approved=true` would resume the execution as approved.
		const { ctx, status } = createContext({
			interaction: true,
			signatureSecret: undefined,
			payload: {
				user: { id: 'U1' },
				actions: [{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE }],
			},
		});

		const result = await slackSendAndWaitWebhook.call(ctx);

		expect(status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
		expect(sendAndWaitWebhook).not.toHaveBeenCalled();
		// verifySignature is short-circuited by the missing secret, so no resume data is produced.
		expect(verifySignature).not.toHaveBeenCalled();
	});

	it('resumes with the responder, channel and message id, and locks the message via response_url', async () => {
		const { ctx, httpRequest } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1', name: 'alice', username: 'alice.w' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
			responder: {
				id: 'U1',
				name: 'alice',
				username: 'alice.w',
				email: 'alice@example.com',
				source: 'slack',
			},
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
			interaction: true,
			signatureSecret: 'secret',
			authentication: 'oAuth2',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_DECLINE_ACTION_ID, value: DECLINE_VALUE, action_ts: '1700000000.000' },
				],
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
		const { ctx, httpRequest, status, send } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			approvers: ['U_ALLOWED'],
			payload: {
				user: { id: 'U_OTHER' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
		// Must acknowledge with a 200 so Slack doesn't time out and retry the same click.
		expect(status).toHaveBeenCalledWith(200);
		expect(send).toHaveBeenCalledWith('');
	});

	it('resumes when the responder is on the approver list', async () => {
		const { ctx, httpRequest } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			approvers: ['U1'],
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
			interaction: true,
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

	it('fails closed as not approved when an approve action_id carries a decline reference', async () => {
		// The two approval signals disagree (native action_id says approve, HMAC-minted reference
		// says decline), so the guard must resolve to not approved rather than trusting either.
		const { ctx, httpRequest } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: DECLINE_VALUE, action_ts: '1700000000.000' },
				],
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

	it('fails closed as not approved when a decline action_id carries an approve reference', async () => {
		const { ctx, httpRequest } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_DECLINE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
			interaction: true,
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
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1', name: 'alice' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
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

	it('does not fall back to the username for the responder name when name is absent', async () => {
		const { ctx, httpRequest } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1', username: 'alice.w' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		httpRequest.mockResolvedValue({});
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });

		const result = (await slackSendAndWaitWebhook.call(ctx)) as {
			workflowData: Array<
				Array<{ json: { data: { responder: { name?: string; username?: string } } } }>
			>;
		};

		const { responder } = result.workflowData[0][0].json.data;
		expect(responder.name).toBeUndefined();
		expect(responder.username).toBe('alice.w');
	});

	it('keeps waiting when notifying an unauthorized responder fails', async () => {
		const { ctx } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			approvers: ['U_ALLOWED'],
			payload: {
				user: { id: 'U_OTHER' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockRejectedValue(new Error('missing chat:write scope'));

		const result = await slackSendAndWaitWebhook.call(ctx);

		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('emits an actioned telemetry event with authorized: true when an approver approves', async () => {
		const { ctx, httpRequest } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			approvers: ['U1'],
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });
		httpRequest.mockResolvedValue({});

		await slackSendAndWaitWebhook.call(ctx);

		expect(ctx.logHitlResponse).toHaveBeenCalledWith({ approved: true, authorized: true });
	});

	it('emits an actioned telemetry event with approved: false for a decline', async () => {
		const { ctx, httpRequest } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			payload: {
				user: { id: 'U1' },
				actions: [
					{ action_id: HITL_DECLINE_ACTION_ID, value: DECLINE_VALUE, action_ts: '1700000000.000' },
				],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
				response_url: 'https://hooks.slack.com/actions/xxx',
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ user: { profile: {} } });
		httpRequest.mockResolvedValue({});

		await slackSendAndWaitWebhook.call(ctx);

		expect(ctx.logHitlResponse).toHaveBeenCalledWith({ approved: false, authorized: true });
	});

	it('emits an actioned telemetry event with authorized: false when a non-approver clicks', async () => {
		const { ctx } = createContext({
			interaction: true,
			signatureSecret: 'secret',
			approvers: ['U_ALLOWED'],
			payload: {
				user: { id: 'U_OTHER' },
				actions: [
					{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: '1700000000.000' },
				],
				channel: { id: 'C1' },
				message: { ts: '111.222' },
			},
		});
		verifySignature.mockResolvedValue(true);
		slackApiRequest.mockResolvedValue({ ok: true });

		await slackSendAndWaitWebhook.call(ctx);

		expect(ctx.logHitlResponse).toHaveBeenCalledWith({ approved: true, authorized: false });
	});

	it('emits no telemetry event for a non-interaction (standard link button) request', async () => {
		const { ctx } = createContext({ method: 'GET', interaction: false });
		sendAndWaitWebhook.mockResolvedValue({ noWebhookResponse: true });

		await slackSendAndWaitWebhook.call(ctx);

		expect(ctx.logHitlResponse).not.toHaveBeenCalled();
	});

	it('falls back to the receive time for respondedAt when action_ts is invalid', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-02T03:04:05.000Z'));
		try {
			const { ctx, httpRequest } = createContext({
				interaction: true,
				signatureSecret: 'secret',
				payload: {
					user: { id: 'U1' },
					actions: [
						{ action_id: HITL_APPROVE_ACTION_ID, value: APPROVE_VALUE, action_ts: 'not-a-number' },
					],
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
