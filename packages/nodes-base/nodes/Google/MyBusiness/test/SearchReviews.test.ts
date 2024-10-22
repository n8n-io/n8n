/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
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
				{ name: 'accounts/123/locations/123/reviews/123', comment: 'Great service!' },
				{ name: 'accounts/123/locations/123/reviews/234', comment: 'Good experience.' },
			],
		});

		const filter = 'Great';
		const result = await searchReviews.call(mockContext, filter);

		expect(result).toEqual({
			results: [
				{
					name: 'Great service!',
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
		mockGoogleApiRequest.mockResolvedValue({
			reviews: [{ name: 'accounts/123/locations/123/reviews/123', comment: 'First Review' }],
			nextPageToken: 'nextToken1',
		});
		mockGoogleApiRequest.mockResolvedValue({
			reviews: [{ name: 'accounts/123/locations/123/reviews/234', comment: 'Second Review' }],
			nextPageToken: 'nextToken2',
		});
		mockGoogleApiRequest.mockResolvedValue({
			reviews: [{ name: 'accounts/123/locations/123/reviews/345', comment: 'Third Review' }],
		});

		const result = await searchReviews.call(mockContext);

		expect(result).toEqual({
			results: [{ name: 'Third Review', value: 'accounts/123/locations/123/reviews/345' }],
			paginationToken: undefined,
		});
	});
});
