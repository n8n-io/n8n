import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { convertNETDates, unleashedApiRequest } from './GenericFunctions';

describe('UnleashedSoftware Node: Generic Functions', () => {
	describe('convertNETDates', () => {
		it('should convert .NET dates to Date objects by default', () => {
			const item: { [key: string]: unknown } = { created: '/Date(1586833770780)/' };

			convertNETDates(item);

			expect(item.created).toBeInstanceOf(Date);
			expect((item.created as Date).getTime()).toBe(1586833770780);
		});

		it('should convert .NET dates to ISO strings when serializeDates is true', () => {
			const item: { [key: string]: unknown } = {
				created: '/Date(1586833770780)/',
				nested: { updated: '/Date(1586833770780)/' },
			};

			convertNETDates(item, true);

			expect(item.created).toBe(new Date(1586833770780).toISOString());
			expect((item.nested as { updated: unknown }).updated).toBe(
				new Date(1586833770780).toISOString(),
			);
		});

		it('should leave non-date strings untouched', () => {
			const item: { [key: string]: unknown } = { name: 'Product 1' };

			convertNETDates(item, true);

			expect(item.name).toBe('Product 1');
		});
	});

	describe('unleashedApiRequest', () => {
		it('should encode a path value that contains a slash', async () => {
			const context = mockDeep<IExecuteFunctions>();
			context.getCredentials.mockResolvedValue({ apiId: 'fake-api-id', apiKey: 'fake-api-key' });
			context.helpers.request.mockResolvedValue({});

			const productId = 'COFFEE01/SalesOrders?x=1';
			await unleashedApiRequest.call(context, 'GET', requestPath`/StockOnHand/${productId}`);

			expect(context.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.objectContaining({
						value: 'https://api.unleashedsoftware.com///StockOnHand/COFFEE01%2FSalesOrders%3Fx=1',
					}),
				}),
			);
		});
	});
});
