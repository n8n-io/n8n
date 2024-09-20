import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { searchReviews } from '../GenericFunctions';

describe('GenericFunctions - searchReviews', () => {
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

	it('should return reviews with filtering', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			reviews: [
				{ name: 'accounts/123/locations/123/reviews/123' },
				{ name: 'accounts/123/locations/123/reviews/234' },
			],
		});

		const filter = 'reviews/123';
		const result = await searchReviews.call(mockContext, filter);

		expect(result).toEqual({
			results: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'accounts/123/locations/123/reviews/123',
					value: 'accounts/123/locations/123/reviews/123',
				},
			],
			paginationToken: undefined,
		});
	});

	it('should handle empty results', async () => {
		mockGoogleApiRequest.mockResolvedValue({ reviews: [] });

		const result = await searchReviews.call(mockContext);

		expect(result).toEqual({ results: [], paginationToken: undefined });
	});

	it('should handle pagination', async () => {
		// Simulate paginated results from googleApiRequest
		mockGoogleApiRequest.mockResolvedValue({
			reviews: [{ name: 'accounts/123/locations/123/reviews/123' }],
			nextPageToken: 'nextToken1',
		});
		mockGoogleApiRequest.mockResolvedValue({
			reviews: [{ name: 'accounts/123/locations/123/reviews/234' }],
			nextPageToken: 'nextToken2',
		});
		mockGoogleApiRequest.mockResolvedValue({
			reviews: [{ name: 'accounts/123/locations/123/reviews/345' }],
		});

		// Call searchReviews
		const result = await searchReviews.call(mockContext);

		// The request would only return the last result
		// N8N handles the pagination and adds the previous results to the results array
		expect(result).toEqual({
			results: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'accounts/123/locations/123/reviews/345',
					value: 'accounts/123/locations/123/reviews/345',
				},
			],
			paginationToken: undefined,
		});
	});
});
