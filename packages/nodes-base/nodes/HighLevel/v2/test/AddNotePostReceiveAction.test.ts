import { highLevelApiRequest } from '../GenericFunctions';

describe('GenericFunctions - highLevelApiRequest', () => {
	let mockContext: any;
	let mockHttpRequestWithAuthentication: jest.Mock;

	beforeEach(() => {
		mockHttpRequestWithAuthentication = jest.fn();
		mockContext = {
			helpers: {
				httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
			},
		};
	});

	test('should make a successful request with all parameters', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'POST';
		const resource = '/example-resource';
		const body = { key: 'value' };
		const qs = { query: 'test' };
		const url = 'https://custom-url.example.com/api';
		const option = { headers: { Authorization: 'Bearer test-token' } };

		const result = await highLevelApiRequest.call(
			mockContext,
			method,
			resource,
			body,
			qs,
			url,
			option,
		);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: { Authorization: 'Bearer test-token' },
			method: 'POST',
			body: { key: 'value' },
			qs: { query: 'test' },
			url: 'https://custom-url.example.com/api',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});

	test('should default to the base URL when no custom URL is provided', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'GET';
		const resource = '/default-resource';

		const result = await highLevelApiRequest.call(mockContext, method, resource);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
				Version: '2021-07-28',
			},
			method: 'GET',
			url: 'https://services.leadconnectorhq.com/default-resource',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});

	test('should remove the body property if it is empty', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'DELETE';
		const resource = '/example-resource';
		const body = {};

		const result = await highLevelApiRequest.call(mockContext, method, resource, body);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
				Version: '2021-07-28',
			},
			method: 'DELETE',
			url: 'https://services.leadconnectorhq.com/example-resource',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});

	test('should remove the query string property if it is empty', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValueOnce(mockResponse);

		const method = 'PATCH';
		const resource = '/example-resource';
		const qs = {};

		const result = await highLevelApiRequest.call(mockContext, method, resource, {}, qs);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith('highLevelOAuth2Api', {
			headers: {
				'Content-Type': 'application/json',
				Version: '2021-07-28',
			},
			method: 'PATCH',
			url: 'https://services.leadconnectorhq.com/example-resource',
			json: true,
		});

		expect(result).toEqual(mockResponse);
	});
});
