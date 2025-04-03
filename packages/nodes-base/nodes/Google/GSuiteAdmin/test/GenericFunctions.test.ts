import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from '../GenericFunctions';

describe('Google GSuiteAdmin Node', () => {
	let mockContext: IExecuteFunctions | ILoadOptionsFunctions;

	beforeEach(() => {
		mockContext = {
			helpers: {
				httpRequestWithAuthentication: jest.fn(),
			},
			getNode: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		jest.clearAllMocks();
	});

	it('should make a successful API request with default options', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			success: true,
		});

		const result = await googleApiRequest.call(mockContext, 'GET', '/example/resource');

		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: 'https://www.googleapis.com/admin/example/resource',
				headers: { 'Content-Type': 'application/json' },
				json: true,
				qs: {},
			}),
		);
		expect(result).toEqual({ success: true });
	});

	it('should omit the body if it is empty', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
			success: true,
		});

		await googleApiRequest.call(mockContext, 'GET', '/example/resource', {});

		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.not.objectContaining({ body: expect.anything() }),
		);
	});

	it('should throw a NodeApiError if the request fails', async () => {
		const errorResponse = { message: 'API Error' };
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockRejectedValueOnce(
			errorResponse,
		);

		await expect(googleApiRequest.call(mockContext, 'GET', '/example/resource')).rejects.toThrow(
			NodeApiError,
		);

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalled();
	});

	it('should return all items across multiple pages', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock)
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
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				url: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				url: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			3,
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				qs: { maxResults: 100, pageToken: '' },
				headers: { 'Content-Type': 'application/json' },
				url: 'https://www.googleapis.com/admin/example/resource',
				json: true,
			}),
		);
	});

	it('should handle single-page responses', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
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
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should handle empty responses', async () => {
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValueOnce({
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
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('should throw a NodeApiError if a request fails', async () => {
		const errorResponse = { message: 'API Error' };
		(mockContext.helpers.httpRequestWithAuthentication as jest.Mock).mockRejectedValueOnce(
			errorResponse,
		);

		await expect(
			googleApiRequestAllItems.call(mockContext, 'items', 'GET', '/example/resource'),
		).rejects.toThrow();

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});
});
