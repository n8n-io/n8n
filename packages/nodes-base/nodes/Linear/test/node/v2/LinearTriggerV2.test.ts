import { createHmac } from 'crypto';

import { mock } from 'vitest-mock-extended';
import type { INodeTypeBaseDescription, IWebhookFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LinearTriggerV2 } from '../../../v2/LinearTriggerV2.node';

describe('LinearTriggerV2', () => {
	const secret = 'test-signing-secret';
	const body = {
		action: 'create',
		type: 'Issue',
		data: { id: 'issue-1' },
		webhookTimestamp: Date.now(),
	};
	const rawBody = Buffer.from(JSON.stringify(body));

	let node: LinearTriggerV2;
	let webhookFunctions: Mocked<IWebhookFunctions>;
	let response: { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };

	const signWith = (signingSecret: string) =>
		createHmac('sha256', signingSecret).update(rawBody).digest('hex');

	beforeEach(() => {
		node = new LinearTriggerV2(mock<INodeTypeBaseDescription>());
		webhookFunctions = mock<IWebhookFunctions>();
		response = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnValue({ end: vi.fn() }),
		};

		webhookFunctions.getWorkflowStaticData.mockReturnValue({ webhookSecret: secret });
		webhookFunctions.getNodeParameter.mockReturnValue('apiToken');
		webhookFunctions.getCredentials.mockResolvedValue({});
		webhookFunctions.getBodyData.mockReturnValue(body);
		webhookFunctions.getResponseObject.mockReturnValue(response as never);
		webhookFunctions.helpers = {
			returnJsonArray: vi.fn((data: unknown) => [data]),
		} as never;
	});

	const mockRequest = (signature?: string) =>
		webhookFunctions.getRequestObject.mockReturnValue({
			rawBody,
			header: (name: string) => (name === 'linear-signature' ? signature : undefined),
		} as never);

	it('should return workflow data when the signature matches the stored webhook secret', async () => {
		mockRequest(signWith(secret));

		const result = await node.webhook.call(webhookFunctions);

		expect(result.workflowData).toEqual([[body]]);
	});

	it('should respond 401 when the signature is invalid', async () => {
		mockRequest(signWith('wrong-secret'));

		const result = await node.webhook.call(webhookFunctions);

		expect(response.status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('should respond 401 when the signature header is missing', async () => {
		mockRequest(undefined);

		const result = await node.webhook.call(webhookFunctions);

		expect(response.status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('should fall back to the credential signing secret when no secret is stored', async () => {
		webhookFunctions.getWorkflowStaticData.mockReturnValue({});
		webhookFunctions.getCredentials.mockResolvedValue({ signingSecret: 'credential-secret' });
		mockRequest(signWith('credential-secret'));

		const result = await node.webhook.call(webhookFunctions);

		expect(result.workflowData).toEqual([[body]]);
	});
});
