import { createHmac } from 'crypto';
import { NodeOperationError } from 'n8n-workflow';

import { WooCommerceTrigger } from '../WooCommerceTrigger.node';

describe('WooCommerceTrigger Node', () => {
	describe('webhook method', () => {
		const rawBody = Buffer.from(JSON.stringify({ id: 42 }));
		const body = { id: 42 };
		const storedSecret = 'stored-secret';

		const validSignature = createHmac('sha256', storedSecret).update(rawBody).digest('base64');

		let webhookData: Record<string, unknown>;
		let headers: Record<string, string | undefined>;
		let response: { status: jest.Mock; send: jest.Mock; end: jest.Mock };
		let mockThis: any;

		beforeEach(() => {
			webhookData = { secret: storedSecret };
			headers = {
				'x-wc-webhook-id': '1',
				'x-wc-webhook-signature': validSignature,
			};
			response = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};

			mockThis = {
				getWorkflowStaticData: jest.fn().mockImplementation(() => webhookData),
				getHeaderData: jest.fn().mockImplementation(() => headers),
				getRequestObject: jest.fn().mockReturnValue({ rawBody, body }),
				getResponseObject: jest.fn().mockReturnValue(response),
				getNode: jest.fn().mockReturnValue({ name: 'WooCommerce Trigger' }),
				helpers: {
					returnJsonArray: jest.fn().mockImplementation((data) => [data]),
				},
			};
		});

		it('returns empty response when x-wc-webhook-id header is missing', async () => {
			delete headers['x-wc-webhook-id'];

			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({});
		});

		it('throws NodeOperationError when stored secret is missing', async () => {
			webhookData = {};

			const trigger = new WooCommerceTrigger();

			await expect(trigger.webhook.call(mockThis)).rejects.toBeInstanceOf(NodeOperationError);
			await expect(trigger.webhook.call(mockThis)).rejects.toThrow(
				'WooCommerce webhook secret is missing',
			);
		});

		it('responds 401 without workflow data when signature header is missing', async () => {
			delete headers['x-wc-webhook-signature'];

			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(response.status).toHaveBeenCalledWith(401);
			expect(response.send).toHaveBeenCalledWith('Unauthorized');
			expect(response.end).toHaveBeenCalled();
		});

		it('responds 401 without workflow data when signature does not match', async () => {
			headers['x-wc-webhook-signature'] = 'not-the-right-signature';

			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(response.status).toHaveBeenCalledWith(401);
			expect(response.send).toHaveBeenCalledWith('Unauthorized');
			expect(response.end).toHaveBeenCalled();
		});

		it('returns workflow data when signature matches', async () => {
			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhook.call(mockThis);

			expect(result).toEqual({ workflowData: [[body]] });
			expect(mockThis.helpers.returnJsonArray).toHaveBeenCalledWith(body);
		});
	});
});
