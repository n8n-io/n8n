import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { getGoogleAccessToken } from '../../../../GenericFunctions';
import { apiRequest, apiRequestAllItems } from '../../../v2/transport';

jest.mock('../../../../GenericFunctions', () => ({
	getGoogleAccessToken: jest.fn(),
}));

describe('Google Sheets Transport', () => {
	let mockExecuteFunction: IExecuteFunctions;
	let mockLoadOptionsFunction: ILoadOptionsFunctions;

	beforeEach(() => {
		mockExecuteFunction = {
			getNode: jest.fn(),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
				requestOAuth2: jest.fn(),
			},
		} as unknown as IExecuteFunctions;

		mockLoadOptionsFunction = {
			...mockExecuteFunction,
		} as unknown as ILoadOptionsFunctions;

		jest.clearAllMocks();
	});
	const mockAccessToken = 'mock-access-token';

	describe('apiRequest', () => {
		it('should make successful request with service account authentication', async () => {
			const method = 'GET';
			const resource = '/v4/spreadsheets';
			const mockResponse = { data: 'test' };

			mockExecuteFunction.getNodeParameter = jest.fn().mockReturnValue('serviceAccount');
			mockExecuteFunction.getCredentials = jest.fn().mockResolvedValue({
				email: 'test@test.com',
				privateKey: 'private-key',
			});
			(getGoogleAccessToken as jest.Mock).mockResolvedValue({ access_token: mockAccessToken });
			mockExecuteFunction.helpers.request = jest.fn().mockResolvedValue(mockResponse);

			const result = await apiRequest.call(mockExecuteFunction, method, resource);

			expect(result).toEqual(mockResponse);
			expect(mockExecuteFunction.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Bearer ${mockAccessToken}`,
					}),
					method,
					uri: `https://sheets.googleapis.com${resource}`,
				}),
			);
		});

		it('should make successful request with OAuth2 authentication', async () => {
			const method = 'GET';
			const resource = '/v4/spreadsheets';
			const mockResponse = { data: 'test' };

			mockExecuteFunction.getNodeParameter = jest.fn().mockReturnValue('oAuth2');
			mockExecuteFunction.helpers.requestOAuth2 = jest.fn().mockResolvedValue(mockResponse);

			const result = await apiRequest.call(mockExecuteFunction, method, resource);

			expect(result).toEqual(mockResponse);
			expect(mockExecuteFunction.helpers.requestOAuth2).toHaveBeenCalled();
		});

		it('should handle custom headers and query parameters', async () => {
			const method = 'GET';
			const resource = '/v4/spreadsheets';
			const headers = { 'Custom-Header': 'value' };
			const qs = { param: 'value' };

			mockExecuteFunction.getNodeParameter = jest.fn().mockReturnValue('serviceAccount');
			mockExecuteFunction.getCredentials = jest.fn().mockResolvedValue({});
			(getGoogleAccessToken as jest.Mock).mockResolvedValue({ access_token: 'token' });

			await apiRequest.call(mockExecuteFunction, method, resource, {}, qs, undefined, headers);

			expect(mockExecuteFunction.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining(headers),
					qs,
				}),
			);
		});

		it('should handle PERMISSION_DENIED error with custom description', async () => {
			const method = 'GET';
			const resource = '/v4/spreadsheets';
			const error = new Error('PERMISSION_DENIED');
			error.message = 'PERMISSION_DENIED Some error';

			mockExecuteFunction.getNodeParameter = jest.fn().mockReturnValue('serviceAccount');
			mockExecuteFunction.getCredentials = jest.fn().mockResolvedValue({});
			mockExecuteFunction.helpers.request = jest.fn().mockRejectedValue(error);

			await expect(apiRequest.call(mockExecuteFunction, method, resource)).rejects.toThrow();
		});

		it('should handle SSL certificate errors', async () => {
			const method = 'GET';
			const resource = '/v4/spreadsheets';
			const error = new Error('ERR_OSSL_PEM_NO_START_LINE');

			mockExecuteFunction.getNodeParameter = jest.fn().mockReturnValue('serviceAccount');
			mockExecuteFunction.getCredentials = jest.fn().mockResolvedValue({});
			mockExecuteFunction.helpers.request = jest.fn().mockRejectedValue(error);

			await expect(apiRequest.call(mockExecuteFunction, method, resource)).rejects.toThrow();
		});
	});

	describe('apiRequestAllItems', () => {
		it('should fetch all pages of results', async () => {
			const propertyName = 'items';
			const method = 'GET';
			const endpoint = '/v4/spreadsheets';
			const firstPage = {
				items: [{ id: 1 }, { id: 2 }],
				nextPageToken: 'token1',
			};
			const secondPage = {
				items: [{ id: 3 }, { id: 4 }],
				nextPageToken: undefined,
			};

			mockLoadOptionsFunction.getNodeParameter = jest.fn().mockReturnValue('serviceAccount');
			mockLoadOptionsFunction.getCredentials = jest.fn().mockResolvedValue({});

			(getGoogleAccessToken as jest.Mock).mockResolvedValue({ access_token: mockAccessToken });
			mockExecuteFunction.helpers.request = jest
				.fn()
				.mockResolvedValueOnce(firstPage)
				.mockResolvedValueOnce(secondPage);

			const result = await apiRequestAllItems.call(
				mockLoadOptionsFunction,
				propertyName,
				method,
				endpoint,
			);

			expect(result).toHaveLength(4);
			expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
		});

		it('should handle empty response', async () => {
			const propertyName = 'items';
			const method = 'GET';
			const endpoint = '/v4/spreadsheets';
			const emptyResponse = {
				items: [],
			};

			mockLoadOptionsFunction.getNodeParameter = jest.fn().mockReturnValue('serviceAccount');
			mockLoadOptionsFunction.getCredentials = jest.fn().mockResolvedValue({});

			(getGoogleAccessToken as jest.Mock).mockResolvedValue({ access_token: mockAccessToken });
			mockExecuteFunction.helpers.request = jest.fn().mockResolvedValue(emptyResponse);

			const result = await apiRequestAllItems.call(
				mockLoadOptionsFunction,
				propertyName,
				method,
				endpoint,
			);

			expect(result).toHaveLength(0);
		});
	});
});
