import type { DeclarativeRestApiSettings, IExecutePaginationFunctions } from 'n8n-workflow';
import { handlePagination } from '../GenericFunctions';

describe('GenericFunctions - handlePagination', () => {
	const mockMakeRoutingRequest = jest.fn();
	const mockGetNodeParameter = jest.fn();

	const mockContext = {
		makeRoutingRequest: mockMakeRoutingRequest,
		getNodeParameter: mockGetNodeParameter,
	} as unknown as IExecutePaginationFunctions;

	beforeEach(() => {
		mockMakeRoutingRequest.mockClear();
		mockGetNodeParameter.mockClear();
	});

	it('should handle pagination and aggregate results properly', async () => {
		mockMakeRoutingRequest
			.mockResolvedValueOnce([
				{
					json: {
						localPosts: [{ id: 1 }, { id: 2 }],
						nextPageToken: 'nextToken1',
					},
				},
			])
			.mockResolvedValueOnce([
				{
					json: {
						localPosts: [{ id: 3 }, { id: 4 }],
						nextPageToken: 'nextToken2',
					},
				},
			])
			.mockResolvedValueOnce([
				{
					json: {
						localPosts: [{ id: 5 }],
					},
				},
			]);

		mockGetNodeParameter.mockReturnValue(10);

		const requestOptions = {
			options: {
				qs: {},
			},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const result = await handlePagination.call(mockContext, requestOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(3);

		expect(result).toEqual([
			{
				json: {
					localPosts: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
				},
			},
		]);
	});

	it('should stop fetching when the limit is reached', async () => {
		mockMakeRoutingRequest
			.mockResolvedValueOnce([
				{
					json: {
						localPosts: [{ id: 1 }, { id: 2 }],
						nextPageToken: 'nextToken1',
					},
				},
			])
			.mockResolvedValueOnce([
				{
					json: {
						localPosts: [{ id: 3 }, { id: 4 }],
					},
				},
			]);

		mockGetNodeParameter.mockReturnValue(3);

		const requestOptions = {
			options: {
				qs: {},
			},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const result = await handlePagination.call(mockContext, requestOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(2);

		expect(result).toEqual([
			{
				json: {
					localPosts: [{ id: 1 }, { id: 2 }, { id: 3 }],
				},
			},
		]);
	});

	it('should handle empty results', async () => {
		mockMakeRoutingRequest.mockResolvedValueOnce([
			{
				json: {
					localPosts: [],
				},
			},
		]);

		mockGetNodeParameter.mockReturnValue(5);

		const requestOptions = {
			options: {
				qs: {},
			},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const result = await handlePagination.call(mockContext, requestOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);

		expect(result).toEqual([{ json: { localPosts: [] } }]);
	});

	it('should return data for properties not in possibleRootProperties', async () => {
		mockMakeRoutingRequest.mockResolvedValueOnce([
			{
				json: {
					otherProperty: 'someValue',
					nextPageToken: undefined,
				},
			},
		]);

		mockGetNodeParameter.mockReturnValue(5);

		const requestOptions = {
			options: {
				qs: {},
			},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const result = await handlePagination.call(mockContext, requestOptions);

		expect(result).toEqual([{ json: { otherProperty: 'someValue' } }]);
	});
});
