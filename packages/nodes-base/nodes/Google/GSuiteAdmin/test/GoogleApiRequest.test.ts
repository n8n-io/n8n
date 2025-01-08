import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

describe('googleApiRequest', () => {
	let mockContext: IExecuteFunctions | ILoadOptionsFunctions;
	let googleApiRequest: (
		this: IExecuteFunctions | ILoadOptionsFunctions,
		method: IHttpRequestMethods,
		resource: string,
		body?: any,
		qs?: IDataObject,
		uri?: string,
		headers?: IDataObject,
	) => Promise<any>;

	beforeEach(() => {
		mockContext = {
			helpers: {
				requestOAuth2: jest.fn(),
			},
			getNode: jest.fn(),
		} as unknown as IExecuteFunctions | ILoadOptionsFunctions;

		googleApiRequest = async function (
			this: IExecuteFunctions | ILoadOptionsFunctions,
			method: IHttpRequestMethods,
			resource: string,
			body: any = {},
			qs: IDataObject = {},
			uri?: string,
			headers: IDataObject = {},
		): Promise<any> {
			const options: IRequestOptions = {
				headers: {
					'Content-Type': 'application/json',
				},
				method,
				body,
				qs,
				uri: uri || `https://www.googleapis.com/admin${resource}`,
				json: true,
			};
			try {
				if (Object.keys(headers).length !== 0) {
					options.headers = Object.assign({}, options.headers, headers);
				}
				if (Object.keys(body as IDataObject).length === 0) {
					delete options.body;
				}
				//@ts-ignore
				return await this.helpers.requestOAuth2.call(this, 'gSuiteAdminOAuth2Api', options);
			} catch (error) {
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		};

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

	it('should handle additional headers', async () => {
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockResolvedValueOnce({ success: true });

		await googleApiRequest.call(mockContext, 'POST', '/example/resource', {}, {}, undefined, {
			Authorization: 'Bearer token',
		});

		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledWith(
			'gSuiteAdminOAuth2Api',
			expect.objectContaining({
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer token',
				},
			}),
		);
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
