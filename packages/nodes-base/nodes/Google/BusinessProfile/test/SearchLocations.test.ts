import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchLocations } from '../GenericFunctions';

describe('GenericFunctions - searchLocations', () => {
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

	it('should return locations with filtering', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			locations: [{ name: 'locations/123' }, { name: 'locations/234' }],
		});

		const filter = '123';
		const result = await searchLocations.call(mockContext, filter);

		expect(result).toEqual({
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			results: [{ name: 'locations/123', value: 'locations/123' }],
			paginationToken: undefined,
		});
	});

	it('should handle empty results', async () => {
		mockGoogleApiRequest.mockResolvedValue({ locations: [] });

		const result = await searchLocations.call(mockContext);

		expect(result).toEqual({ results: [], paginationToken: undefined });
	});

	it('should handle pagination', async () => {
		mockGoogleApiRequest.mockResolvedValue({
			locations: [{ name: 'locations/123' }],
			nextPageToken: 'nextToken1',
		});
		mockGoogleApiRequest.mockResolvedValue({
			locations: [{ name: 'locations/234' }],
			nextPageToken: 'nextToken2',
		});
		mockGoogleApiRequest.mockResolvedValue({
			locations: [{ name: 'locations/345' }],
		});

		const result = await searchLocations.call(mockContext);

		// The request would only return the last result
		// N8N handles the pagination and adds the previous results to the results array
		expect(result).toEqual({
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			results: [{ name: 'locations/345', value: 'locations/345' }],
			paginationToken: undefined,
		});
	});
});
