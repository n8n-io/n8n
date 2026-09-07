import { createHmac } from 'crypto';
import { NodeOperationError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { WooCommerceTrigger } from '../WooCommerceTrigger.node';
import type { Mock } from 'vitest';
import type * as _importType0 from '../GenericFunctions';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	woocommerceApiRequest: vi.fn(),
}));

const woocommerceApiRequestMock = GenericFunctions.woocommerceApiRequest as Mock;

describe('WooCommerceTrigger Node', () => {
	describe('webhook method', () => {
		const rawBody = Buffer.from(JSON.stringify({ id: 42 }));
		const body = { id: 42 };
		const storedSecret = 'stored-secret';

		const validSignature = createHmac('sha256', storedSecret).update(rawBody).digest('base64');

		let webhookData: Record<string, unknown>;
		let headers: Record<string, string | undefined>;
		let response: { status: Mock; send: Mock; end: Mock };
		let mockThis: any;

		beforeEach(() => {
			webhookData = { secret: storedSecret };
			headers = {
				'x-wc-webhook-id': '1',
				'x-wc-webhook-signature': validSignature,
			};
			response = {
				status: vi.fn().mockReturnThis(),
				send: vi.fn().mockReturnThis(),
				end: vi.fn(),
			};

			mockThis = {
				getWorkflowStaticData: vi.fn().mockImplementation(() => webhookData),
				getHeaderData: vi.fn().mockImplementation(() => headers),
				getRequestObject: vi.fn().mockReturnValue({ rawBody, body }),
				getResponseObject: vi.fn().mockReturnValue(response),
				getNode: vi.fn().mockReturnValue({ name: 'WooCommerce Trigger' }),
				helpers: {
					returnJsonArray: vi.fn().mockImplementation((data) => [data]),
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

	describe('checkExists method', () => {
		const webhookUrl = 'https://n8n.example.com/webhook/test';
		const event = 'order.created';

		let webhookData: Record<string, unknown>;
		let logger: { warn: Mock };
		let mockThis: any;

		beforeEach(() => {
			webhookData = { secret: 'stored-secret' };
			logger = { warn: vi.fn() };

			mockThis = {
				getNodeWebhookUrl: vi.fn().mockReturnValue(webhookUrl),
				getWorkflowStaticData: vi.fn().mockImplementation(() => webhookData),
				getNodeParameter: vi.fn().mockReturnValue(event),
				logger,
			};

			woocommerceApiRequestMock.mockReset();
		});

		it('returns true and stores webhookId when matching webhook exists and secret is stored', async () => {
			woocommerceApiRequestMock.mockResolvedValueOnce([
				{ id: 99, status: 'active', delivery_url: webhookUrl, topic: event },
			]);

			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(true);
			expect(webhookData.webhookId).toBe(99);
			expect(woocommerceApiRequestMock).toHaveBeenCalledTimes(1);
			expect(woocommerceApiRequestMock).toHaveBeenCalledWith(
				'GET',
				'/webhooks',
				{},
				{ status: 'active', per_page: 100 },
			);
		});

		it('deletes the orphaned webhook and returns false when secret is missing from static data', async () => {
			webhookData = {};
			woocommerceApiRequestMock
				.mockResolvedValueOnce([
					{ id: 99, status: 'active', delivery_url: webhookUrl, topic: event },
				])
				.mockResolvedValueOnce(undefined);

			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(woocommerceApiRequestMock).toHaveBeenNthCalledWith(
				2,
				'DELETE',
				'/webhooks/99',
				{},
				{ force: true },
			);
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('returns false without throwing when deleting the orphaned webhook fails', async () => {
			webhookData = {};
			const deleteError = new Error('boom');
			woocommerceApiRequestMock
				.mockResolvedValueOnce([
					{ id: 99, status: 'active', delivery_url: webhookUrl, topic: event },
				])
				.mockRejectedValueOnce(deleteError);

			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete orphaned webhook during checkExists',
				{ webhookId: 99, error: deleteError },
			);
		});

		it('returns false when no matching webhook exists', async () => {
			woocommerceApiRequestMock.mockResolvedValueOnce([
				{ id: 77, status: 'active', delivery_url: 'https://other.example.com', topic: event },
				{ id: 88, status: 'active', delivery_url: webhookUrl, topic: 'product.created' },
			]);

			const trigger = new WooCommerceTrigger();
			const result = await trigger.webhookMethods.default.checkExists.call(mockThis);

			expect(result).toBe(false);
			expect(webhookData.webhookId).toBeUndefined();
			expect(woocommerceApiRequestMock).toHaveBeenCalledTimes(1);
		});
	});
});
