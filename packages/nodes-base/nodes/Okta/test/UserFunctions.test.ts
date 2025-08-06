import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	getCursorPaginator,
	getUsers,
	oktaApiRequest,
	simplifyGetAllResponse,
	simplifyGetResponse,
} from '../UserFunctions';

describe('oktaApiRequest', () => {
	const mockGetCredentials = jest.fn();
	const mockHttpRequestWithAuthentication = jest.fn();

	const mockContext = {
		getCredentials: mockGetCredentials,
		helpers: {
			httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
		},
	} as unknown as IExecuteFunctions;

	beforeEach(() => {
		mockGetCredentials.mockClear();
		mockHttpRequestWithAuthentication.mockClear();
	});

	it('should make a GET request and return data', async () => {
		mockGetCredentials.mockResolvedValue({ url: 'https://okta.example.com' });
		mockHttpRequestWithAuthentication.mockResolvedValue([
			{ profile: { firstName: 'John', lastName: 'Doe' }, id: '1' },
		]);

		const response = await oktaApiRequest.call(mockContext, 'GET', 'users');

		expect(mockGetCredentials).toHaveBeenCalledWith('oktaApi');
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('oktaApi', {
			headers: { 'Content-Type': 'application/json' },
			method: 'GET',
			body: undefined,
			qs: undefined,
			url: 'https://okta.example.com/api/v1/users',
			json: true,
		});
		expect(response).toEqual([{ profile: { firstName: 'John', lastName: 'Doe' }, id: '1' }]);
	});

	// Tests for error handling
	it('should handle errors from oktaApiRequest', async () => {
		mockHttpRequestWithAuthentication.mockRejectedValue(new Error('Network error'));

		await expect(oktaApiRequest.call(mockContext, 'GET', 'users')).rejects.toThrow('Network error');
	});
});

describe('getUsers', () => {
	const mockOktaApiRequest = jest.fn();
	const mockContext = {
		getCredentials: jest.fn().mockResolvedValue({ url: 'https://okta.example.com' }),
		helpers: {
			httpRequestWithAuthentication: mockOktaApiRequest,
		},
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockOktaApiRequest.mockClear();
	});

	it('should return users with filtering', async () => {
		mockOktaApiRequest.mockResolvedValue([
			{ profile: { login: 'John@example.com' }, id: '1' },
			{ profile: { login: 'Jane@example.com' }, id: '2' },
		]);

		const response = await getUsers.call(mockContext, 'john');

		expect(response).toEqual({
			results: [{ name: 'John@example.com', value: '1' }],
		});
	});

	it('should return all users when no filter is applied', async () => {
		mockOktaApiRequest.mockResolvedValue([
			{ profile: { login: 'John@example.com' }, id: '1' },
			{ profile: { login: 'Jane@example.com' }, id: '2' },
		]);

		const response = await getUsers.call(mockContext);

		expect(response).toEqual({
			results: [
				{ name: 'John@example.com', value: '1' },
				{ name: 'Jane@example.com', value: '2' },
			],
		});
	});

	// Tests for empty results
	it('should handle empty results from oktaApiRequest', async () => {
		mockOktaApiRequest.mockResolvedValue([]);

		const response = await getUsers.call(mockContext);

		expect(response).toEqual({
			results: [],
		});
	});
});

describe('simplifyGetAllResponse', () => {
	const mockGetNodeParameter = jest.fn();
	const mockContext = {
		getNodeParameter: mockGetNodeParameter,
	} as unknown as IExecuteSingleFunctions;
	const mockResponse = jest.fn() as unknown as IN8nHttpFullResponse;

	const items: INodeExecutionData[] = [
		{
			json: [
				{
					id: '01',
					status: 'ACTIVE',
					created: '2023-01-01T00:00:00.000Z',
					activated: '2023-01-01T00:00:01.000Z',
					lastLogin: null,
					lastUpdated: '2023-01-01T00:00:01.000Z',
					passwordChanged: null,
					some_item: 'some_value',
					profile: {
						firstName: 'John',
						lastName: 'Doe',
						login: 'john.doe@example.com',
						email: 'john.doe@example.com',
						some_profile_item: 'some_profile_value',
					},
				},
			] as unknown as IDataObject,
		},
	];

	beforeEach(() => {
		mockGetNodeParameter.mockClear();
	});

	it('should return items unchanged when simplify parameter is not set', async () => {
		mockGetNodeParameter.mockReturnValueOnce(false);

		const expectedResult: INodeExecutionData[] = [
			{
				json: {
					id: '01',
					status: 'ACTIVE',
					created: '2023-01-01T00:00:00.000Z',
					activated: '2023-01-01T00:00:01.000Z',
					lastLogin: null,
					lastUpdated: '2023-01-01T00:00:01.000Z',
					passwordChanged: null,
					some_item: 'some_value',
					profile: {
						firstName: 'John',
						lastName: 'Doe',
						login: 'john.doe@example.com',
						email: 'john.doe@example.com',
						some_profile_item: 'some_profile_value',
					},
				},
			},
		];

		const result = await simplifyGetAllResponse.call(mockContext, items, mockResponse);
		expect(result).toEqual(expectedResult);
	});

	it('should simplify items correctly', async () => {
		mockGetNodeParameter.mockReturnValueOnce(true);

		const expectedResult: INodeExecutionData[] = [
			{
				json: {
					id: '01',
					status: 'ACTIVE',
					created: '2023-01-01T00:00:00.000Z',
					activated: '2023-01-01T00:00:01.000Z',
					lastLogin: null,
					lastUpdated: '2023-01-01T00:00:01.000Z',
					passwordChanged: null,
					profile: {
						firstName: 'John',
						lastName: 'Doe',
						login: 'john.doe@example.com',
						email: 'john.doe@example.com',
					},
				},
			},
		];

		const result = await simplifyGetAllResponse.call(mockContext, items, mockResponse);
		expect(result).toEqual(expectedResult);
	});

	it('should return an empty array when items is an empty array', async () => {
		mockGetNodeParameter.mockReturnValueOnce(false);

		const emptyArrayItems: INodeExecutionData[] = [];

		const result = await simplifyGetAllResponse.call(mockContext, emptyArrayItems, mockResponse);
		expect(result).toEqual([]);
	});
});

describe('simplifyGetResponse', () => {
	const mockGetNodeParameter = jest.fn();
	const mockContext = {
		getNodeParameter: mockGetNodeParameter,
	} as unknown as IExecuteSingleFunctions;
	const mockResponse = jest.fn() as unknown as IN8nHttpFullResponse;

	const items: INodeExecutionData[] = [
		{
			json: {
				id: '01',
				status: 'ACTIVE',
				created: '2023-01-01T00:00:00.000Z',
				activated: '2023-01-01T00:00:01.000Z',
				lastLogin: null,
				lastUpdated: '2023-01-01T00:00:01.000Z',
				passwordChanged: null,
				some_item: 'some_value',
				profile: {
					firstName: 'John',
					lastName: 'Doe',
					login: 'john.doe@example.com',
					email: 'john.doe@example.com',
					some_profile_item: 'some_profile_value',
				},
			} as unknown as IDataObject,
		},
	];
	beforeEach(() => {
		mockGetNodeParameter.mockClear();
	});

	it('should return the item unchanged when simplify parameter is not set', async () => {
		mockGetNodeParameter.mockReturnValueOnce(false);

		const expectedResult: INodeExecutionData[] = [
			{
				json: {
					id: '01',
					status: 'ACTIVE',
					created: '2023-01-01T00:00:00.000Z',
					activated: '2023-01-01T00:00:01.000Z',
					lastLogin: null,
					lastUpdated: '2023-01-01T00:00:01.000Z',
					passwordChanged: null,
					some_item: 'some_value',
					profile: {
						firstName: 'John',
						lastName: 'Doe',
						login: 'john.doe@example.com',
						email: 'john.doe@example.com',
						some_profile_item: 'some_profile_value',
					},
				},
			},
		];

		const result = await simplifyGetResponse.call(mockContext, items, mockResponse);
		expect(result).toEqual(expectedResult);
	});

	it('should simplify the item correctly', async () => {
		mockGetNodeParameter.mockReturnValueOnce(true);

		const expectedResult: INodeExecutionData[] = [
			{
				json: {
					id: '01',
					status: 'ACTIVE',
					created: '2023-01-01T00:00:00.000Z',
					activated: '2023-01-01T00:00:01.000Z',
					lastLogin: null,
					lastUpdated: '2023-01-01T00:00:01.000Z',
					passwordChanged: null,
					profile: {
						firstName: 'John',
						lastName: 'Doe',
						login: 'john.doe@example.com',
						email: 'john.doe@example.com',
					},
				},
			},
		];

		const result = await simplifyGetResponse.call(mockContext, items, mockResponse);
		expect(result).toEqual(expectedResult);
	});
});
describe('getCursorPaginator', () => {
	let mockContext: IExecutePaginationFunctions;
	let mockRequestOptions: DeclarativeRestApiSettings.ResultOptions;
	const baseUrl = 'https://api.example.com';

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			makeRoutingRequest: jest.fn(),
		} as unknown as IExecutePaginationFunctions;

		mockRequestOptions = {
			options: {
				qs: {},
			},
		} as DeclarativeRestApiSettings.ResultOptions;
	});

	it('should return all items when returnAll is true', async () => {
		const mockResponseData: INodeExecutionData[] = [
			{ json: { id: 1 }, headers: { link: `<${baseUrl}?after=cursor1>` } },
			{ json: { id: 2 }, headers: { link: `<${baseUrl}?after=cursor2>` } },
			{ json: { id: 3 }, headers: { link: `<${baseUrl}>` } },
		];

		(mockContext.getNodeParameter as jest.Mock).mockReturnValue(true);
		(mockContext.makeRoutingRequest as jest.Mock)
			.mockResolvedValueOnce([mockResponseData[0]])
			.mockResolvedValueOnce([mockResponseData[1]])
			.mockResolvedValueOnce([mockResponseData[2]]);

		const paginator = getCursorPaginator().bind(mockContext);
		const result = await paginator(mockRequestOptions);

		expect(result).toEqual(mockResponseData);
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('returnAll', true);
		expect(mockContext.makeRoutingRequest).toHaveBeenCalledTimes(3);
	});

	it('should return items until nextCursor is undefined', async () => {
		const mockResponseData: INodeExecutionData[] = [
			{ json: { id: 1 }, headers: { link: `<${baseUrl}?after=cursor1>` } },
			{ json: { id: 2 }, headers: { link: `<${baseUrl}>` } },
		];

		(mockContext.getNodeParameter as jest.Mock).mockReturnValue(true);
		(mockContext.makeRoutingRequest as jest.Mock)
			.mockResolvedValueOnce([mockResponseData[0]])
			.mockResolvedValueOnce([mockResponseData[1]]);

		const paginator = getCursorPaginator().bind(mockContext);
		const result = await paginator(mockRequestOptions);

		expect(result).toEqual(mockResponseData);
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('returnAll', true);
		expect(mockContext.makeRoutingRequest).toHaveBeenCalledTimes(2);
	});

	it('should handle empty response data', async () => {
		(mockContext.getNodeParameter as jest.Mock).mockReturnValue(true);
		(mockContext.makeRoutingRequest as jest.Mock).mockResolvedValue([]);

		const paginator = getCursorPaginator().bind(mockContext);
		const result = await paginator(mockRequestOptions);

		expect(result).toEqual([]);
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('returnAll', true);
		expect(mockContext.makeRoutingRequest).toHaveBeenCalledTimes(1);
	});
});
