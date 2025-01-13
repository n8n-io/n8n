import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { googleApiRequest } from '../GenericFunctions';

describe('googleApiRequest', () => {
	let mockContext: IExecuteFunctions | ILoadOptionsFunctions;

	beforeEach(() => {
		mockContext = {
			helpers: {
				requestOAuth2: jest.fn(),
			},
			getNode: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		jest.clearAllMocks();
	});

	it('should make a successful API request with default options', async () => {
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockResolvedValueOnce({ success: true });

		const result = await googleApiRequest.call(mockContext, 'GET', '/example/resource');

		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				uri: 'https://www.googleapis.com/admin/example/resource',
				headers: { 'Content-Type': 'application/json' },
				json: true,
			}),
		);
		expect(result).toEqual({ success: true });
	});

	it('should omit the body if it is empty', async () => {
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockResolvedValueOnce({ success: true });

		await googleApiRequest.call(mockContext, 'GET', '/example/resource', {});

		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.not.objectContaining({ body: expect.anything() }),
		);
	});

	it('should throw a NodeApiError if the request fails', async () => {
		const errorResponse = { message: 'API Error' };
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockRejectedValueOnce(errorResponse);

		await expect(googleApiRequest.call(mockContext, 'GET', '/example/resource')).rejects.toThrow(
			NodeApiError,
		);

		expect(mockContext.getNode).toHaveBeenCalled();
		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalled();
	});
});
