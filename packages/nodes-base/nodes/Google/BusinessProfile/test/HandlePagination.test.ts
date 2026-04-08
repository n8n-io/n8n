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

	it('should stop fetching when the limit is reached and returnAll is false', async () => {
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

		mockGetNodeParameter.mockReturnValueOnce(false);
		mockGetNodeParameter.mockReturnValueOnce(3);

		const requestOptions = {
			options: {
				qs: {},
			},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const result = await handlePagination.call(mockContext, requestOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(2);
		expect(result).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]);
	});

	it('should handle empty results', async () => {
		mockMakeRoutingRequest.mockResolvedValueOnce([
			{
				json: {
					localPosts: [],
				},
			},
		]);

		mockGetNodeParameter.mockReturnValueOnce(false);
		mockGetNodeParameter.mockReturnValueOnce(5);

		const requestOptions = {
			options: {
				qs: {},
			},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const result = await handlePagination.call(mockContext, requestOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);

		expect(result).toEqual([]);
	});

	it('should fetch all items when returnAll is true', async () => {
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

		mockGetNodeParameter.mockReturnValueOnce(true);

		const requestOptions = {
			options: {
				qs: {},
			},
		} as unknown as DeclarativeRestApiSettings.ResultOptions;

		const result = await handlePagination.call(mockContext, requestOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(3);

		expect(result).toEqual([
			{ json: { id: 1 } },
			{ json: { id: 2 } },
			{ json: { id: 3 } },
			{ json: { id: 4 } },
			{ json: { id: 5 } },
		]);
	});
});
