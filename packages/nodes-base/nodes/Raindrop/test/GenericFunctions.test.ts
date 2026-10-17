import { NodeApiError } from 'n8n-workflow';

import { raindropApiRequest, raindropApiRequestAllItems } from '../GenericFunctions';

describe('Raindrop -> GenericFunctions', () => {
	let mockExecuteFunctions: any;

	beforeEach(() => {
		mockExecuteFunctions = {
			helpers: {
				requestOAuth2: vi.fn(),
			},
			getNode: vi.fn().mockReturnValue({ name: 'Raindrop' }),
		};
	});

	describe('raindropApiRequest', () => {
		it('should make an authenticated OAuth2 request', async () => {
			const response = { result: true, item: { _id: 123 } };
			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValue(response);

			const result = await raindropApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'/raindrop/123',
				{},
				{},
			);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'raindropOAuth2Api',
				{
					headers: { 'Content-Type': 'application/json' },
					method: 'GET',
					uri: 'https://api.raindrop.io/rest/v1/raindrop/123',
					json: true,
				},
				{
					includeCredentialsOnRefreshOnBody: true,
				},
			);
			expect(result).toEqual(response);
		});

		it('should include body and qs when provided', async () => {
			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValue({ result: true });

			await raindropApiRequest.call(
				mockExecuteFunctions,
				'POST',
				'/raindrop',
				{ search: 'test' },
				{ link: 'https://example.com' },
			);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'raindropOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					qs: { search: 'test' },
					body: { link: 'https://example.com' },
				}),
				expect.anything(),
			);
		});

		it('should wrap errors in NodeApiError', async () => {
			mockExecuteFunctions.helpers.requestOAuth2.mockRejectedValue(new Error('API failure'));

			await expect(
				raindropApiRequest.call(mockExecuteFunctions, 'GET', '/raindrop/123', {}, {}),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('raindropApiRequestAllItems', () => {
		it('should return empty array immediately without making a request when limit is 0 or negative', async () => {
			const zeroResult = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
				{},
				{},
				0,
			);
			const negativeResult = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
				{},
				{},
				-5,
			);

			expect(zeroResult).toEqual([]);
			expect(negativeResult).toEqual([]);
			expect(mockExecuteFunctions.helpers.requestOAuth2).not.toHaveBeenCalled();
		});

		it('should paginate across multiple pages when returnAll is true (limit=undefined)', async () => {
			const page0Items = Array.from({ length: 50 }, (_, i) => ({ _id: i + 1 }));
			const page1Items = Array.from({ length: 25 }, (_, i) => ({ _id: i + 51 }));

			mockExecuteFunctions.helpers.requestOAuth2
				.mockResolvedValueOnce({
					result: true,
					items: page0Items,
					count: 75,
				})
				.mockResolvedValueOnce({
					result: true,
					items: page1Items,
					count: 75,
				});

			const results = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
			);

			expect(results).toHaveLength(75);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(2);

			const firstCallArgs = mockExecuteFunctions.helpers.requestOAuth2.mock.calls[0][1];
			expect(firstCallArgs.qs).toEqual({ page: 0, perpage: 50 });

			const secondCallArgs = mockExecuteFunctions.helpers.requestOAuth2.mock.calls[1][1];
			expect(secondCallArgs.qs).toEqual({ page: 1, perpage: 50 });
		});

		it('should stop when fewer items than perpage are returned', async () => {
			const page0Items = Array.from({ length: 15 }, (_, i) => ({ _id: i + 1 }));

			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
				result: true,
				items: page0Items,
				count: 15,
			});

			const results = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
			);

			expect(results).toHaveLength(15);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('should stop without an extra request when returnData reaches count', async () => {
			const page0Items = Array.from({ length: 50 }, (_, i) => ({ _id: i + 1 }));

			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
				result: true,
				items: page0Items,
				count: 50,
			});

			const results = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
			);

			expect(results).toHaveLength(50);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('should request fewer items and stop early when limit < 50', async () => {
			const items = Array.from({ length: 5 }, (_, i) => ({ _id: i + 1 }));

			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
				result: true,
				items,
				count: 100,
			});

			const results = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
				{},
				{},
				5,
			);

			expect(results).toHaveLength(5);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);

			const callArgs = mockExecuteFunctions.helpers.requestOAuth2.mock.calls[0][1];
			expect(callArgs.qs).toEqual({ page: 0, perpage: 5 });
		});

		it('should slice results when limit spans across pages', async () => {
			const page0Items = Array.from({ length: 50 }, (_, i) => ({ _id: i + 1 }));
			const page1Items = Array.from({ length: 50 }, (_, i) => ({ _id: i + 51 }));

			mockExecuteFunctions.helpers.requestOAuth2
				.mockResolvedValueOnce({
					result: true,
					items: page0Items,
					count: 200,
				})
				.mockResolvedValueOnce({
					result: true,
					items: page1Items,
					count: 200,
				});

			const results = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
				{},
				{},
				60,
			);

			expect(results).toHaveLength(60);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
		});

		it('should return empty array if no items returned', async () => {
			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
				result: true,
				items: [],
				count: 0,
			});

			const results = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'items',
				'GET',
				'/raindrops/0',
			);

			expect(results).toEqual([]);
		});
	});
});
