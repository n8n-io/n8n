import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { googleApiRequest } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	googleApiRequest: jest.fn(),
}));

describe('googleApiRequestAllItems', () => {
	let mockContext: IExecuteFunctions | ILoadOptionsFunctions;
	let googleApiRequestAllItems: (
		this: IExecuteFunctions | ILoadOptionsFunctions,
		propertyName: string,
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
		endpoint: string,
		body?: any,
		query?: IDataObject,
	) => Promise<any>;

	beforeEach(() => {
		mockContext = {
			requestWithAuthentication: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		googleApiRequestAllItems = async function (
			this: IExecuteFunctions | ILoadOptionsFunctions,
			propertyName: string,
			method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
			endpoint: string,
			body: any = {},
			query: IDataObject = {},
		): Promise<any> {
			const returnData: IDataObject[] = [];

			let responseData;
			query.maxResults = 100;

			do {
				responseData = await googleApiRequest.call(this, method, endpoint, body, query);
				query.pageToken = responseData.nextPageToken;
				returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
			} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

			return returnData;
		};

		(googleApiRequest as jest.Mock).mockReset();
	});

	it('should handle a single page of results', async () => {
		(googleApiRequest as jest.Mock).mockResolvedValueOnce({
			users: [
				{ id: '1', name: 'User 1' },
				{ id: '2', name: 'User 2' },
			],
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'users',
			'GET',
			'/directory/v1/users',
		);

		expect(result).toEqual([
			{ id: '1', name: 'User 1' },
			{ id: '2', name: 'User 2' },
		]);
		expect(googleApiRequest).toHaveBeenCalledTimes(1);
	});

	it('should handle multiple pages of results', async () => {
		(googleApiRequest as jest.Mock)
			.mockResolvedValueOnce({
				users: [{ id: '1', name: 'User 1' }],
				nextPageToken: 'page2',
			})
			.mockResolvedValueOnce({
				users: [{ id: '2', name: 'User 2' }],
				nextPageToken: 'page3',
			})
			.mockResolvedValueOnce({
				users: [{ id: '3', name: 'User 3' }],
			});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'users',
			'GET',
			'/directory/v1/users',
		);

		expect(result).toEqual([
			{ id: '1', name: 'User 1' },
			{ id: '2', name: 'User 2' },
			{ id: '3', name: 'User 3' },
		]);
		expect(googleApiRequest).toHaveBeenCalledTimes(3);
	});

	it('should return an empty array if no results are found', async () => {
		(googleApiRequest as jest.Mock).mockResolvedValueOnce({
			users: [],
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'users',
			'GET',
			'/directory/v1/users',
		);

		expect(result).toEqual([]);
		expect(googleApiRequest).toHaveBeenCalledTimes(1);
	});

	it('should handle missing propertyName gracefully', async () => {
		(googleApiRequest as jest.Mock).mockResolvedValueOnce({});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'missingProperty',
			'GET',
			'/directory/v1/users',
		);

		expect(result).toEqual([]);
		expect(googleApiRequest).toHaveBeenCalledTimes(1);
	});

	it('should stop fetching when nextPageToken is undefined or empty', async () => {
		(googleApiRequest as jest.Mock).mockResolvedValueOnce({
			users: [{ id: '1', name: 'User 1' }],
			nextPageToken: '',
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'users',
			'GET',
			'/directory/v1/users',
		);

		expect(result).toEqual([{ id: '1', name: 'User 1' }]);
		expect(googleApiRequest).toHaveBeenCalledTimes(1);
	});
});
