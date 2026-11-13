import {
	NodeApiError,
	requestPath,
	type ILoadOptionsFunctions,
	type IPollFunctions,
} from 'n8n-workflow';

import { googleApiRequest, locationPath } from '../GenericFunctions';

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

		const result = await googleApiRequest.call(mockContext, 'GET', requestPath`/test-resource`);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'googleBusinessProfileOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: expect.objectContaining({
					value: 'https://mybusiness.googleapis.com/v4/test-resource',
				}),
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
		const result = await googleApiRequest.call(
			mockContext,
			'POST',
			requestPath`/test-resource`,
			requestBody,
		);

		expect(mockHttpRequestWithAuthentication).toHaveBeenCalledWith(
			'googleBusinessProfileOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: requestBody,
				url: expect.objectContaining({
					value: 'https://mybusiness.googleapis.com/v4/test-resource',
				}),
				qs: {},
				json: true,
			}),
		);

		expect(result).toEqual(mockResponse);
	});

	it('should remove the body for GET requests', async () => {
		const mockResponse = { success: true };
		mockHttpRequestWithAuthentication.mockResolvedValue(mockResponse);

		const result = await googleApiRequest.call(mockContext, 'GET', requestPath`/test-resource`, {});

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

		await expect(
			googleApiRequest.call(mockContext, 'GET', requestPath`/test-resource`),
		).rejects.toThrow(NodeApiError);

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockHttpRequestWithAuthentication).toHaveBeenCalled();
	});
});

describe('locationPath', () => {
	const mockContext = { getNode: jest.fn() } as unknown as ILoadOptionsFunctions;

	it('should build the path from the account and location names', () => {
		expect(locationPath.call(mockContext, 'accounts/123', 'locations/456').toString()).toBe(
			'/accounts/123/locations/456',
		);
	});

	it('should encode characters that are not valid in a path segment', () => {
		expect(locationPath.call(mockContext, 'accounts/12?3', 'locations/4#56').toString()).toBe(
			'/accounts/12%3F3/locations/4%2356',
		);
	});

	it.each([
		['123', 'locations/456', 'The resource name "123" must have the form "accounts/*"'],
		['accounts/', 'locations/456', 'The resource name "accounts/" must have the form "accounts/*"'],
		[
			'accounts/123',
			'accounts/123/locations/456',
			'The resource name "accounts/123/locations/456" must have the form "locations/*"',
		],
	])('should reject the account "%s" and location "%s"', (account, location, message) => {
		expect(() => locationPath.call(mockContext, account, location)).toThrow(message);
	});
});
