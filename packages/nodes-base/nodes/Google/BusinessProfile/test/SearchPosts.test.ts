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
		mockGoogleApiRequest.mockClear();
		mockGetNodeParameter.mockClear();
		mockGetNodeParameter.mockReturnValue('parameterValue');
	});

	it('should return posts with filtering', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			localPosts: [
				{ name: 'accounts/123/locations/123/localPosts/123', summary: 'First Post' },
				{ name: 'accounts/123/locations/123/localPosts/234', summary: 'Second Post' },
			],
		});

		const filter = 'First';
		const result = await searchPosts.call(mockContext, filter);

		expect(result).toEqual({
			results: [
				{
					name: 'First Post',
					value: 'accounts/123/locations/123/localPosts/123',
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
			localPosts: [{ name: 'accounts/123/locations/123/localPosts/123', summary: 'First Post' }],
			nextPageToken: 'nextToken1',
		});
		mockGoogleApiRequest.mockResolvedValue({
			localPosts: [{ name: 'accounts/123/locations/123/localPosts/234', summary: 'Second Post' }],
			nextPageToken: 'nextToken2',
		});
		mockGoogleApiRequest.mockResolvedValue({
			localPosts: [{ name: 'accounts/123/locations/123/localPosts/345', summary: 'Third Post' }],
		});

		const result = await searchPosts.call(mockContext);

		expect(result).toEqual({
			results: [{ name: 'Third Post', value: 'accounts/123/locations/123/localPosts/345' }],
			paginationToken: undefined,
		});
	});
});
