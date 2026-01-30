import { NodeApiError } from 'n8n-workflow';

import { wordpressApiRequest, wordpressApiRequestAllItems } from '../GenericFunctions';

describe('Wordpress > GenericFunctions', () => {
	const mockFunctions: any = {
		helpers: {
			requestWithAuthentication: jest.fn(),
		},
		getCredentials: jest.fn().mockResolvedValue({
			url: 'http://example.com',
			allowUnauthorizedCerts: false,
		}),
		getNode: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('wordpressApiRequest', () => {
		it('should make a successful request with pretty permalinks', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			const result = await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});
			expect(result).toEqual({ data: 'testData' });
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressApi',
				expect.objectContaining({
					uri: 'http://example.com/wp-json/wp/v2/posts',
				}),
			);
		});

		it('should retry with non-pretty permalinks on 404 error', async () => {
			// First call fails with 404
			mockFunctions.helpers.requestWithAuthentication
				.mockRejectedValueOnce({ statusCode: 404, message: 'Not Found' })
				.mockResolvedValueOnce({ data: 'testData' });

			const result = await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});
			expect(result).toEqual({ data: 'testData' });
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);

			// Second call should use non-pretty permalink format
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				'wordpressApi',
				expect.objectContaining({
					uri: 'http://example.com/?rest_route=/wp/v2/posts',
				}),
			);
		});

		it('should handle URL with trailing slash', async () => {
			mockFunctions.getCredentials.mockResolvedValueOnce({
				url: 'http://example.com/',
				allowUnauthorizedCerts: false,
			});
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });

			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressApi',
				expect.objectContaining({
					uri: 'http://example.com/wp-json/wp/v2/posts',
				}),
			);
		});

		it('should throw NodeApiError on non-404 failure', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockRejectedValue({
				statusCode: 500,
				message: 'Internal Server Error',
			});
			await expect(
				wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {}),
			).rejects.toThrow(NodeApiError);
		});

		it('should throw NodeApiError if both pretty and non-pretty permalinks fail', async () => {
			mockFunctions.helpers.requestWithAuthentication
				.mockRejectedValueOnce({ statusCode: 404, message: 'Not Found' })
				.mockRejectedValueOnce({ statusCode: 404, message: 'Not Found' });

			await expect(
				wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {}),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('wordpressApiRequestAllItems', () => {
		it('should accumulate all pages', async () => {
			mockFunctions.helpers.requestWithAuthentication
				.mockResolvedValueOnce({
					body: [{ post: 1 }],
					headers: {
						'x-wp-totalpages': '2',
					},
				})
				.mockResolvedValueOnce({
					body: [{ post: 2 }],
					headers: {
						'x-wp-totalpages': '2',
					},
				});

			const results = await wordpressApiRequestAllItems.call(mockFunctions, 'GET', '/posts');
			expect(results).toEqual([{ post: 1 }, { post: 2 }]);
		});
	});
});
