import { createHmac } from 'crypto';

import { mock } from 'vitest-mock-extended';
import type { IDataObject, INodeTypeBaseDescription, IWebhookFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LinearTriggerV2 } from '../../../v2/LinearTriggerV2.node';

describe('LinearTriggerV2', () => {
	const secret = 'test-signing-secret';
	const body = { action: 'create', type: 'Issue', data: { id: 'issue-1' } };
	const rawBody = Buffer.from(JSON.stringify(body));

	let node: LinearTriggerV2;
	let webhookFunctions: Mocked<IWebhookFunctions>;

	beforeEach(() => {
		node = new LinearTriggerV2(mock<INodeTypeBaseDescription>());
		webhookFunctions = mock<IWebhookFunctions>();
		webhookFunctions.getWorkflowStaticData.mockReturnValue({ webhookSecret: secret });
		webhookFunctions.getBodyData.mockReturnValue(body as unknown as IDataObject);
		webhookFunctions.getRequestObject.mockReturnValue({ rawBody } as never);
		webhookFunctions.helpers = {
			returnJsonArray: vi.fn((data: IDataObject) => [data]),
		} as never;
	});

	it('should return workflow data when the Linear-Signature is valid', async () => {
		const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
		webhookFunctions.getHeaderData.mockReturnValue({ 'linear-signature': signature });

		const result = await node.webhook.call(webhookFunctions);

		expect(result.workflowData).toEqual([[body]]);
	});

	it('should not start the workflow when the Linear-Signature is invalid', async () => {
		const signature = createHmac('sha256', 'wrong-secret').update(rawBody).digest('hex');
		webhookFunctions.getHeaderData.mockReturnValue({ 'linear-signature': signature });

		const result = await node.webhook.call(webhookFunctions);

		expect(result).toEqual({});
	});

	it('should not start the workflow when the Linear-Signature header is missing', async () => {
		webhookFunctions.getHeaderData.mockReturnValue({});

		const result = await node.webhook.call(webhookFunctions);

		expect(result).toEqual({});
	});

	it('should pass through when no webhook secret is stored', async () => {
		webhookFunctions.getWorkflowStaticData.mockReturnValue({});
		webhookFunctions.getHeaderData.mockReturnValue({});

		const result = await node.webhook.call(webhookFunctions);

		expect(result.workflowData).toEqual([[body]]);
	});
});
