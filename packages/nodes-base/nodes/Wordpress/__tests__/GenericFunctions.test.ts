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
		getNodeParameter: jest.fn().mockReturnValue('basicAuth'),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockFunctions.getNodeParameter.mockReturnValue('basicAuth');
		mockFunctions.getCredentials.mockResolvedValue({
			url: 'http://example.com',
			allowUnauthorizedCerts: false,
		});
	});

	describe('wordpressApiRequest', () => {
		it('should make a successful request', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			const result = await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});
			expect(result).toEqual({ data: 'testData' });
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		it('should use wordpressApi credential for basic auth', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});

			expect(mockFunctions.getCredentials).toHaveBeenCalledWith('wordpressApi');
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressApi',
				expect.objectContaining({
					uri: 'http://example.com/wp-json/wp/v2/posts',
					rejectUnauthorized: true,
				}),
			);
		});

		it('should throw NodeApiError on failure', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockRejectedValue({ message: 'fail' });
			await expect(
				wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {}),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('wordpressApiRequest with OAuth2', () => {
		beforeEach(() => {
			mockFunctions.getNodeParameter.mockReturnValue('oAuth2');
			mockFunctions.getCredentials.mockResolvedValue({
				wordpressSite: 'myblog.wordpress.com',
			});
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
		});

		it('should use wordpressOAuth2Api credential', async () => {
			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});

			expect(mockFunctions.getCredentials).toHaveBeenCalledWith('wordpressOAuth2Api');
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressOAuth2Api',
				expect.objectContaining({ method: 'GET' }),
			);
		});

		it('should always include /sites/{site} in the URL', async () => {
			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressOAuth2Api',
				expect.objectContaining({
					uri: 'https://public-api.wordpress.com/wp/v2/sites/myblog.wordpress.com/posts',
				}),
			);
		});

		it('should use /sites/{site} for a custom domain site', async () => {
			mockFunctions.getCredentials.mockResolvedValue({
				wordpressSite: 'myblog.com',
			});

			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressOAuth2Api',
				expect.objectContaining({
					uri: 'https://public-api.wordpress.com/wp/v2/sites/myblog.com/posts',
				}),
			);
		});

		it.each([
			['https://myblog.com/', 'myblog.com'],
			['https://myblog.com', 'myblog.com'],
			['http://myblog.com/', 'myblog.com'],
			['myblog.com/', 'myblog.com'],
			['myblog.com/path', 'myblog.com'],
			['myblog.wordpress.com', 'myblog.wordpress.com'],
		])('should normalize wordpressSite input "%s" to "%s" in the URL', async (input, expected) => {
			mockFunctions.getCredentials.mockResolvedValue({
				wordpressSite: input,
			});

			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});

			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressOAuth2Api',
				expect.objectContaining({
					uri: `https://public-api.wordpress.com/wp/v2/sites/${expected}/posts`,
				}),
			);
		});

		it('should not set rejectUnauthorized for OAuth2 path', async () => {
			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});

			const callArgs = mockFunctions.helpers.requestWithAuthentication.mock.calls[0][1];
			expect(callArgs).not.toHaveProperty('rejectUnauthorized');
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
