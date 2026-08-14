import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { IExecuteFunctions, INode, Logger } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import * as genericFunctions from '../../GenericFunctions';
import { prepareChatApproval } from '../../hitl/setup';
import { deriveHitlSecretToken } from '../../hitl/tokens';

const TEST_HMAC_SECRET = 'test-hmac-secret';
Container.set(InstanceSettings, { hmacSignatureSecret: TEST_HMAC_SECRET } as InstanceSettings);

const ACCESS_TOKEN = '123456:test-bot-token';
const SIGNED_RESUME_URL =
	'https://mybot.example.com/webhook-waiting/42/node-1?approved=true&signature=abc';
const FIXED_ENDPOINT_URL = 'https://mybot.example.com/webhook-waiting-telegram';

vi.mock('../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof genericFunctions>('../../GenericFunctions');
	return {
		...originalModule,
		apiRequest: vi.fn(),
	};
});

function makeContext(): MockProxy<IExecuteFunctions> {
	const context = mock<IExecuteFunctions>();
	context.getExecutionId.mockReturnValue('42');
	context.getNode.mockReturnValue(mock<INode>({ id: 'node-1' }));
	context.getSignedResumeUrl.mockReturnValue(SIGNED_RESUME_URL);
	context.getCredentials.mockResolvedValue({ accessToken: ACCESS_TOKEN });
	context.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as Logger;
	return context;
}

function mockWebhookInfo(result: { url: string; allowed_updates?: string[] }) {
	(genericFunctions.apiRequest as Mock).mockImplementation((_method: string, endpoint: string) => {
		if (endpoint === 'getWebhookInfo') return { result };
		return {};
	});
}

describe('prepareChatApproval', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns false without any API call when chatApproval is off', async () => {
		const context = makeContext();
		context.getNodeParameter.mockReturnValue(false);

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(false);
		expect(genericFunctions.apiRequest).not.toHaveBeenCalled();
	});

	it('returns false without any API call when responseType is not approval, even if chatApproval is stale-true', async () => {
		// The UI only shows "Approve Within Chat" when responseType is 'approval', but a
		// hidden parameter keeps its last value if responseType is switched afterwards.
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) => {
			if (name === 'chatApproval') return true;
			if (name === 'responseType') return 'freeText';
			return undefined;
		});

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(false);
		expect(genericFunctions.apiRequest).not.toHaveBeenCalled();
	});

	it('falls back to link buttons and warns when the instance is not public HTTPS', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		context.getSignedResumeUrl.mockReturnValue(
			'http://localhost/webhook-waiting/42/node-1?approved=true&signature=abc',
		);

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(false);
		expect(context.logger.warn).toHaveBeenCalled();
		expect(genericFunctions.apiRequest).not.toHaveBeenCalled();
	});

	it('falls back to link buttons and warns for an IPv6 loopback instance', async () => {
		// A URL's hostname getter brackets IPv6 addresses ("[::1]", not "::1"),
		// so this must be recognized as loopback too.
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		context.getSignedResumeUrl.mockReturnValue(
			'https://[::1]/webhook-waiting/42/node-1?approved=true&signature=abc',
		);

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(false);
		expect(context.logger.warn).toHaveBeenCalled();
		expect(genericFunctions.apiRequest).not.toHaveBeenCalled();
	});

	it('registers the fixed endpoint when the bot webhook is free', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		mockWebhookInfo({ url: '' });

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(true);
		expect(genericFunctions.apiRequest).toHaveBeenCalledWith('POST', 'setWebhook', {
			url: FIXED_ENDPOINT_URL,
			secret_token: deriveHitlSecretToken(ACCESS_TOKEN),
			allowed_updates: ['callback_query'],
			drop_pending_updates: false,
		});
	});

	it('re-registers idempotently when the webhook already points at our fixed endpoint', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		mockWebhookInfo({ url: FIXED_ENDPOINT_URL });

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(true);
		expect(genericFunctions.apiRequest).toHaveBeenCalledWith(
			'POST',
			'setWebhook',
			expect.objectContaining({ url: FIXED_ENDPOINT_URL }),
		);
	});

	it('coexists without calling setWebhook when a same-instance trigger forwards callback_query', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		mockWebhookInfo({
			url: 'https://mybot.example.com/webhook/abc123/webhook',
			allowed_updates: ['callback_query'],
		});

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(true);
		expect(genericFunctions.apiRequest).not.toHaveBeenCalledWith(
			'POST',
			'setWebhook',
			expect.anything(),
		);
	});

	it('coexists with a same-instance trigger behind a reverse-proxy path prefix', async () => {
		// The Trigger's live-webhook URL carries the same reverse-proxy prefix as our
		// own signed resume URL; recognizing it must account for that prefix too.
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		context.getSignedResumeUrl.mockReturnValue(
			'https://mybot.example.com/n8n-instance/webhook-waiting/42/node-1?approved=true&signature=abc',
		);
		mockWebhookInfo({
			url: 'https://mybot.example.com/n8n-instance/webhook/abc123/webhook',
			allowed_updates: ['callback_query'],
		});

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(true);
		expect(genericFunctions.apiRequest).not.toHaveBeenCalledWith(
			'POST',
			'setWebhook',
			expect.anything(),
		);
	});

	it('coexists when the same-instance trigger has no allowed_updates filter (implicit all)', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		mockWebhookInfo({ url: 'https://mybot.example.com/webhook/abc123/webhook' });

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(true);
	});

	it('throws an actionable error when a same-instance trigger has not subscribed to callback_query', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		mockWebhookInfo({
			url: 'https://mybot.example.com/webhook/abc123/webhook',
			allowed_updates: ['message'],
		});

		await expect(prepareChatApproval(context)).rejects.toThrow(NodeOperationError);
	});

	it('throws an actionable error when the webhook is claimed by a foreign system', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		mockWebhookInfo({ url: 'https://someone-elses-system.example.com/hook' });

		await expect(prepareChatApproval(context)).rejects.toThrow(
			/someone-elses-system\.example\.com/,
		);
	});

	it('throws an actionable error for a same-origin webhook that is not a Trigger path', async () => {
		// Same origin alone isn't proof of a forwarding Telegram Trigger: this could be
		// any other endpoint on this instance (our own fixed HITL endpoint, some other
		// node's webhook, etc), not a live-webhook path.
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		mockWebhookInfo({
			url: 'https://mybot.example.com/some-other-nodes-webhook',
			allowed_updates: ['callback_query'],
		});

		await expect(prepareChatApproval(context)).rejects.toThrow(/some-other-nodes-webhook/);
	});

	it('falls back to link buttons and warns when getWebhookInfo fails', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		(genericFunctions.apiRequest as Mock).mockRejectedValue(new Error('network error'));

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(false);
		expect(context.logger.warn).toHaveBeenCalled();
	});

	it('falls back to link buttons and warns when setWebhook fails', async () => {
		const context = makeContext();
		context.getNodeParameter.mockImplementation((name: unknown) =>
			name === 'responseType' ? 'approval' : true,
		);
		(genericFunctions.apiRequest as Mock).mockImplementation(
			(_method: string, endpoint: string) => {
				if (endpoint === 'getWebhookInfo') return { result: { url: '' } };
				throw new Error('setWebhook rejected');
			},
		);

		const effective = await prepareChatApproval(context);

		expect(effective).toBe(false);
		expect(context.logger.warn).toHaveBeenCalled();
		expect(genericFunctions.apiRequest).toHaveBeenCalledWith(
			'POST',
			'setWebhook',
			expect.anything(),
		);
	});
});
