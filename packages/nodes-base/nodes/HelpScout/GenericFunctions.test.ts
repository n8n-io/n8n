import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { helpscoutApiRequestAllItems } from './GenericFunctions';

jest.mock('n8n-workflow', () => {
	const original = jest.requireActual('n8n-workflow');
	return { ...original, NodeApiError: original.NodeApiError };
});

describe('HelpScout GenericFunctions', () => {
	let mockContext: IExecuteFunctions;
	let mockRequestOAuth2: jest.Mock;

	beforeEach(() => {
		mockRequestOAuth2 = jest.fn();
		mockContext = {
			helpers: {
				requestOAuth2: mockRequestOAuth2,
			},
			getNode: jest.fn().mockReturnValue({ name: 'HelpScout', type: 'helpScout' }),
		} as unknown as IExecuteFunctions;
		jest.clearAllMocks();
	});

	describe('helpscoutApiRequestAllItems', () => {
		it('should pass query params on the first request', async () => {
			mockRequestOAuth2.mockResolvedValueOnce({
				_embedded: { items: [{ id: 1 }] },
			});

			await helpscoutApiRequestAllItems.call(
				mockContext,
				'_embedded.items',
				'GET',
				'/v2/conversations',
				{},
				{ status: 'active', sortField: 'createdAt' },
			);

			const requestOptions = mockRequestOAuth2.mock.calls[0][1];
			expect(requestOptions.qs).toEqual({ status: 'active', sortField: 'createdAt' });
		});

		it('should not pass query params on paginated requests', async () => {
			const paginationUrl = 'https://api.helpscout.net/v2/conversations?page=2&status=active';

			mockRequestOAuth2
				.mockResolvedValueOnce({
					_embedded: { items: [{ id: 1 }] },
					_links: { next: { href: paginationUrl } },
				})
				.mockResolvedValueOnce({
					_embedded: { items: [{ id: 2 }] },
				});

			const result = await helpscoutApiRequestAllItems.call(
				mockContext,
				'_embedded.items',
				'GET',
				'/v2/conversations',
				{},
				{ status: 'active' },
			);

			// First call: query params passed
			expect(mockRequestOAuth2.mock.calls[0][1].qs).toEqual({ status: 'active' });
			// Second call (paginated): query params empty, URI used instead
			expect(mockRequestOAuth2.mock.calls[1][1].qs).toEqual({});
			expect(mockRequestOAuth2.mock.calls[1][1].uri).toBe(paginationUrl);
			expect(result).toEqual([{ id: 1 }, { id: 2 }]);
		});

		it('should stop when limit is reached', async () => {
			mockRequestOAuth2
				.mockResolvedValueOnce({
					_embedded: { items: [{ id: 1 }, { id: 2 }] },
					_links: { next: { href: 'https://api.helpscout.net/v2/items?page=2' } },
				})
				.mockResolvedValueOnce({
					_embedded: { items: [{ id: 3 }] },
				});

			const result = await helpscoutApiRequestAllItems.call(
				mockContext,
				'_embedded.items',
				'GET',
				'/v2/items',
				{},
				{ limit: 2 },
			);

			expect(result).toEqual([{ id: 1 }, { id: 2 }]);
			expect(mockRequestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('should accumulate all pages when no limit is set', async () => {
			mockRequestOAuth2
				.mockResolvedValueOnce({
					_embedded: { items: [{ id: 1 }] },
					_links: { next: { href: 'https://api.helpscout.net/v2/items?page=2' } },
				})
				.mockResolvedValueOnce({
					_embedded: { items: [{ id: 2 }] },
					_links: { next: { href: 'https://api.helpscout.net/v2/items?page=3' } },
				})
				.mockResolvedValueOnce({
					_embedded: { items: [{ id: 3 }] },
				});

			const result = await helpscoutApiRequestAllItems.call(
				mockContext,
				'_embedded.items',
				'GET',
				'/v2/items',
			);

			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
			expect(mockRequestOAuth2).toHaveBeenCalledTimes(3);
		});
	});
});
