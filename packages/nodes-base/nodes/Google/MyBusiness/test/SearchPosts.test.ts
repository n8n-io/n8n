import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { searchPosts } from '../GenericFunctions';

describe('GenericFunctions - searchPosts', () => {
	const mockGoogleApiRequest = jest.fn();
	const mockGetNodeParameter = jest.fn();

	const mockContext = {
		helpers: {
			httpRequestWithAuthentication: mockGoogleApiRequest,
		},
		getNodeParameter: mockGetNodeParameter,
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		// Clear mocks before each test
		mockGoogleApiRequest.mockClear();
		mockGetNodeParameter.mockClear();

		// Always return the same parameter value
		mockGetNodeParameter.mockReturnValue('parameterValue');
	});

	it('should return posts with filtering', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			localPosts: [
				{ name: 'accounts/123/locations/123/posts/123' },
				{ name: 'accounts/123/locations/123/posts/234' },
			],
		});

		const filter = 'posts/123';
		const result = await searchPosts.call(mockContext, filter);

		expect(result).toEqual({
			results: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'accounts/123/locations/123/posts/123',
					value: 'accounts/123/locations/123/posts/123',
				},
			],
			paginationToken: undefined,
		});
	});

	it('should handle empty results', async () => {
		mockGoogleApiRequest.mockResolvedValue({ localPosts: [] });

		const result = await searchPosts.call(mockContext);

		expect(result).toEqual({ results: [], paginationToken: undefined });
	});

	it('should handle pagination', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			localPosts: [{ name: 'accounts/123/locations/123/posts/123' }],
			nextPageToken: 'nextToken1',
		});
		mockGoogleApiRequest.mockResolvedValue({
			localPosts: [{ name: 'accounts/123/locations/123/posts/234' }],
			nextPageToken: 'nextToken2',
		});
		mockGoogleApiRequest.mockResolvedValue({
			localPosts: [{ name: 'accounts/123/locations/123/posts/345' }],
		});

		const result = await searchPosts.call(mockContext);

		expect(result).toEqual({
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			results: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'accounts/123/locations/123/posts/345',
					value: 'accounts/123/locations/123/posts/345',
				},
			],
			paginationToken: undefined,
		});
	});
});
