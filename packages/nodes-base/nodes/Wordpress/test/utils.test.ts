import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow/src';

import { wordpressApiRequest } from '../GenericFunctions';

describe('wordpressApiRequest', () => {
	const mockHttpRequestWithAuthentication = jest.fn();
	const mockContext = {
		helpers: {
			requestWithAuthentication: mockHttpRequestWithAuthentication,
		},
		getCredentials: jest.fn().mockImplementation(async (type) => {
			if (type === 'wordpressApi') {
				return {
					url: 'https://example.com',
					username: 'testuser',
					password: 'testpassword',
					allowUnauthorizedCerts: false,
				};
			}
			return {};
		}),
	} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should make a POST request with body and return data', async () => {
		const mockResponse = {
			id: 123,
			date: '2023-10-15T14:30:45',
			date_gmt: '2023-10-15T14:30:45',
			guid: { rendered: 'https://example.com/test-post' },
			modified: '2023-10-15T14:30:45',
			modified_gmt: '2023-10-15T14:30:45',
			slug: 'my-test-post-title',
			status: 'publish',
			type: 'post',
			link: 'https://example.com/my-test-post-title',
			title: { rendered: 'My Test Post Title' },
			content: {
				rendered: 'This is the full content of the blog post with <b>HTML</b> formatting.',
			},
			excerpt: { rendered: 'This is a short excerpt for the post' },
			featured_media: 42,
		};
		mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

		const requestBody = {
			title: 'My Test Post Title',
			excerpt: 'This is a short excerpt for the post',
			content: 'This is the full content of the blog post with <b>HTML</b> formatting.',
			featured_media: 42,
		};

		const result = await wordpressApiRequest.call(mockContext, 'POST', '/posts', requestBody);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'wordpressApi',
			expect.objectContaining({
				method: 'POST',
				uri: 'https://example.com/wp-json/wp/v2/posts',
				body: requestBody,
			}),
		);

		expect(result).toEqual(mockResponse);
	});
});
