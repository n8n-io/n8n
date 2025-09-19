import { NodeApiError, type ILoadOptionsFunctions, type IPollFunctions } from 'n8n-workflow';

import { googleApiRequest } from '../GenericFunctions';

describe('googleApiRequest', () => {
	const mockHttpRequestWithAuthentication = jest.fn();
	const mockContext = {
		helpers: {
			httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
		},
		getNode: jest.fn(),
	} as unknown as ILoadOptionsFunctions | IPollFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should make a GET request and return data', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

		const result = await googleApiRequest.call(mockContext, 'GET', '/test-resource');

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'googleBusinessProfileOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: 'https://mybusiness.googleapis.com/v4/test-resource',
				qs: {},
				json: true,
			}),
		);

		expect(result).toEqual(mockResponse);
	});

	it('should make a POST request with body and return data', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

		const requestBody = { key: 'value' };
		const result = await googleApiRequest.call(mockContext, 'POST', '/test-resource', requestBody);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'googleBusinessProfileOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: requestBody,
				url: 'https://mybusiness.googleapis.com/v4/test-resource',
				qs: {},
				json: true,
			}),
		);

		expect(result).toEqual(mockResponse);
	});

	it('should remove the body for GET requests', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

		const result = await googleApiRequest.call(mockContext, 'GET', '/test-resource', {});

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'googleBusinessProfileOAuth2Api',
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			expect.not.objectContaining({ body: expect.anything() }),
		);

		expect(result).toEqual(mockResponse);
	});

	it('should throw NodeApiError on API failure', async () => {
		const mockError = new Error('API request failed');
		mockHttpRequestWithAuthentication.mockRejectedValue(mockError);

		await expect(googleApiRequest.call(mockContext, 'GET', '/test-resource')).rejects.toThrow(
			NodeApiError,
		);

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalled();
	});
});
