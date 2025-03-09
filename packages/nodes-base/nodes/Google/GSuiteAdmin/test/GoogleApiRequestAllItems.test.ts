import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../GenericFunctions';

describe('googleApiRequestAllItems', () => {
	let mockContext: IExecuteFunctions | ILoadOptionsFunctions;

	beforeEach(() => {
		mockContext = {
			helpers: {
				requestOAuth2: jest.fn(),
			},
			getNode: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		jest.clearAllMocks();
	});
	it('should return all items across multiple pages', async () => {
		(mockContext.helpers.requestOAuth2 as jest.Mock)
			.mockResolvedValueOnce({
				nextPageToken: 'pageToken1',
				items: [{ id: '1' }, { id: '2' }],
			})
			.mockResolvedValueOnce({
				nextPageToken: 'pageToken2',
				items: [{ id: '3' }, { id: '4' }],
			})
			.mockResolvedValueOnce({
				nextPageToken: '',
				items: [{ id: '5' }],
			});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'items',
			'GET',
			'/example/resource',
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }]);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(3);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				uri: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenNthCalledWith(
			2,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				uri: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenNthCalledWith(
			3,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				uri: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
	});

	it('should handle single-page responses', async () => {
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockResolvedValueOnce({
			nextPageToken: '',
			items: [{ id: '1' }, { id: '2' }],
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'items',
			'GET',
			'/example/resource',
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
	});

	it('should handle empty responses', async () => {
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockResolvedValueOnce({
			nextPageToken: '',
			items: [],
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'items',
			'GET',
			'/example/resource',
		);

		expect(result).toEqual([]);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
	});

	it('should throw a NodeApiError if a request fails', async () => {
		const errorResponse = { message: 'API Error' };
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockRejectedValueOnce(errorResponse);

		await expect(
			googleApiRequestAllItems.call(mockContext, 'items', 'GET', '/example/resource'),
		).rejects.toThrow();

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
	});
});
