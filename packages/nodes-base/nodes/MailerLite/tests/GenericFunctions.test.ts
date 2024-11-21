import {
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type IHookFunctions,
	NodeApiError,
} from 'n8n-workflow';
import nock from 'nock';

import { mailerliteApiRequest, mailerliteApiRequestAllItems } from '../GenericFunctions'; // Adjust the import path as needed

describe('mailerliteApiRequest', () => {
	let mockExecuteFunctions: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

	const setupMockFunctions = (typeVersion: number) => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ typeVersion }),
			helpers: {
				httpRequestWithAuthentication: jest.fn(),
			},
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;
		jest.clearAllMocks();
	};

	beforeEach(() => {
		setupMockFunctions(1);
	});

	it('should make a successful API request for type version 1', async () => {
		const method = 'GET';
		const path = '/test';
		const body = {};
		const qs = {};

		const responseData = { success: true };

		nock('https://api.mailerlite.com').get('/api/v2/test').reply(200, responseData);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
			responseData,
		);

		const result = await mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs);

		expect(result).toEqual(responseData);
		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'mailerLiteApi',
			{
				method,
				qs,
				url: 'https://api.mailerlite.com/api/v2/test',
				json: true,
			},
		);
	});

	it('should make a successful API request for type version 2', async () => {
		setupMockFunctions(2);

		const method = 'GET';
		const path = '/test';
		const body = {};
		const qs = {};

		const responseData = { success: true };

		nock('https://connect.mailerlite.com').get('/api/test').reply(200, responseData);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
			responseData,
		);

		const result = await mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs);

		expect(result).toEqual(responseData);
		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'mailerLiteApi',
			{
				method,
				qs,
				url: 'https://connect.mailerlite.com/api/test',
				json: true,
			},
		);
	});

	it('should make an API request with an empty body', async () => {
		const method = 'GET';
		const path = '/test';
		const body = {};
		const qs = {};

		const responseData = { success: true };

		nock('https://api.mailerlite.com').get('/api/v2/test').reply(200, responseData);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
			responseData,
		);

		const result = await mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs);

		expect(result).toEqual(responseData);
		expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'mailerLiteApi',
			{
				method,
				qs,
				url: 'https://api.mailerlite.com/api/v2/test',
				json: true,
			},
		);
	});

	it('should throw an error if the API request fails', async () => {
		const method = 'GET';
		const path = '/test';
		const body = {};
		const qs = {};

		const errorResponse = { message: 'Error' };

		nock('https://api.mailerlite.com').get('/api/v2/test').reply(400, errorResponse);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock).mockRejectedValue(
			errorResponse,
		);

		await expect(
			mailerliteApiRequest.call(mockExecuteFunctions, method, path, body, qs),
		).rejects.toThrow(NodeApiError);
	});
});

describe('mailerliteApiRequestAllItems', () => {
	let mockExecuteFunctions: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

	const setupMockFunctions = (typeVersion: number) => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ typeVersion }),
			helpers: {
				httpRequestWithAuthentication: jest.fn(),
			},
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;
		jest.clearAllMocks();
	};

	beforeEach(() => {
		setupMockFunctions(1);
	});

	it('should handle pagination for type version 1', async () => {
		const method = 'GET';
		const endpoint = '/test';
		const body = {};
		const query = {};

		const responseDataPage1 = [{ id: 1 }, { id: 2 }];
		const responseDataPage2 = [{ id: 3 }, { id: 4 }];

		nock('https://api.mailerlite.com')
			.get('/api/v2/test')
			.query({ limit: 1000, offset: 0 })
			.reply(200, responseDataPage1)
			.get('/api/v2/test')
			.query({ limit: 1000, offset: 1000 })
			.reply(200, responseDataPage2)
			.get('/api/v2/test')
			.query({ limit: 1000, offset: 2000 })
			.reply(200, []);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
			.mockResolvedValueOnce(responseDataPage1)
			.mockResolvedValueOnce(responseDataPage2)
			.mockResolvedValueOnce([]);

		const result = await mailerliteApiRequestAllItems.call(
			mockExecuteFunctions,
			method,
			endpoint,
			body,
			query,
		);

		expect(result).toEqual([...responseDataPage1, ...responseDataPage2]);
	});

	it('should handle pagination for type version 2', async () => {
		setupMockFunctions(2);

		const method = 'GET';
		const endpoint = '/test';
		const body = {};
		const query = {};

		const responseDataPage1 = {
			data: [{ id: 1 }, { id: 2 }],
			meta: { next_cursor: 'cursor1' },
			links: { next: 'nextLink1' },
		};
		const responseDataPage2 = {
			data: [{ id: 3 }, { id: 4 }],
			meta: { next_cursor: null },
			links: { next: null },
		};

		nock('https://connect.mailerlite.com')
			.get('/api/test')
			.query({ limit: 1000, offset: 0 })
			.reply(200, responseDataPage1)
			.get('/api/test')
			.query({ limit: 1000, cursor: 'cursor1' })
			.reply(200, responseDataPage2);

		(mockExecuteFunctions.helpers.httpRequestWithAuthentication as jest.Mock)
			.mockResolvedValueOnce(responseDataPage1)
			.mockResolvedValueOnce(responseDataPage2);

		const result = await mailerliteApiRequestAllItems.call(
			mockExecuteFunctions,
			method,
			endpoint,
			body,
			query,
		);

		expect(result).toEqual([...responseDataPage1.data, ...responseDataPage2.data]);
	});
});
