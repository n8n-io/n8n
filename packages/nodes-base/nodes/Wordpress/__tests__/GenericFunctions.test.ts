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
		it('should make a successful request', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			const result = await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});
			expect(result).toEqual({ data: 'testData' });
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalled();
		});

		it('should set Cache-Control set to no-cache for non-read requests', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			await wordpressApiRequest.call(mockFunctions, 'POST', '/posts', {}, {});
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressApi',
				expect.objectContaining({
					headers: expect.objectContaining({
						'Cache-Control': 'no-cache',
					}),
				}),
			);
		});

		it('should not set Cache-Control for GET requests', async () => {
			mockFunctions.helpers.requestWithAuthentication.mockResolvedValue({ data: 'testData' });
			await wordpressApiRequest.call(mockFunctions, 'GET', '/posts', {}, {});
			expect(mockFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'wordpressApi',
				expect.objectContaining({
					headers: expect.not.objectContaining({
						'Cache-Control': 'no-cache',
					}),
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
