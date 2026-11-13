import { NodeApiError, requestPath } from 'n8n-workflow';

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
		it('should make a successful request', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			const result = await wordpressApiRequest.call(
				mockFunctions,
				'GET',
				requestPath`/posts`,
				{},
				{},
			);
			expect(result).toEqual({ data: 'testData' });
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		it('should build the request URL from the site URL', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			await wordpressApiRequest.call(mockFunctions, 'GET', requestPath`/posts`, {}, {});

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressApi',
				expect.objectContaining({
					uri: expect.objectContaining({ value: 'http://example.com/wp-json/wp/v2/posts' }),
					rejectUnauthorized: true,
				}),
			);
		});

		it('should encode path values and keep the path prefix of the site URL', async () => {
			mockFunctions.getCredentials.mockResolvedValueOnce({
				url: 'https://blog.example.com/wp/',
				allowUnauthorizedCerts: false,
			});
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({});
			const postId = '1/users?x=1';

			await wordpressApiRequest.call(mockFunctions, 'GET', requestPath`/posts/${postId}`);

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressApi',
				expect.objectContaining({
					uri: expect.objectContaining({
						value: 'https://blog.example.com/wp/wp-json/wp/v2/posts/1%2Fusers%3Fx=1',
					}),
				}),
			);
		});

		it('should throw NodeApiError on failure', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockRejectedValue({ message: 'fail' });
			await expect(
				wordpressApiRequest.call(mockFunctions, 'GET', requestPath`/posts`, {}, {}),
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

			const results = await wordpressApiRequestAllItems.call(
				mockFunctions,
				'GET',
				requestPath`/posts`,
			);
			expect(results).toEqual([{ post: 1 }, { post: 2 }]);
		});
	});
});
