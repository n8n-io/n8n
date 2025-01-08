import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { addLocationIdPreSendAction } from '../GenericFunctions';

describe('addLocationIdPreSendAction', () => {
	let mockThis: Partial<IExecuteSingleFunctions>;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
		};
	});

	it('should add locationId to query parameters for contact getAll operation', async () => {
		(mockThis.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('contact')
			.mockReturnValueOnce('getAll');

		(mockThis.getCredentials as jest.Mock).mockResolvedValue({
			oauthTokenData: { locationId: '123' },
		});

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			qs: {},
		};

		const result = await addLocationIdPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.qs).toEqual({ locationId: '123' });
	});

	it('should add locationId to the body for contact create operation', async () => {
		(mockThis.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('contact')
			.mockReturnValueOnce('create');

		(mockThis.getCredentials as jest.Mock).mockResolvedValue({
			oauthTokenData: { locationId: '123' },
		});

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await addLocationIdPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({ locationId: '123' });
	});

	it('should add locationId to query parameters for opportunity getAll operation', async () => {
		(mockThis.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('opportunity')
			.mockReturnValueOnce('getAll');

		(mockThis.getCredentials as jest.Mock).mockResolvedValue({
			oauthTokenData: { locationId: '123' },
		});

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			qs: {},
		};

		const result = await addLocationIdPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.qs).toEqual({ location_id: '123' });
	});

	it('should add locationId to the body for opportunity create operation', async () => {
		(mockThis.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('opportunity')
			.mockReturnValueOnce('create');

		(mockThis.getCredentials as jest.Mock).mockResolvedValue({
			oauthTokenData: { locationId: '123' },
		});

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await addLocationIdPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({ locationId: '123' });
	});

	it('should not modify requestOptions if no resource or operation matches', async () => {
		(mockThis.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('unknown')
			.mockReturnValueOnce('unknown');

		(mockThis.getCredentials as jest.Mock).mockResolvedValue({
			oauthTokenData: { locationId: '123' },
		});

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
			qs: {},
		};

		const result = await addLocationIdPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result).toEqual(requestOptions);
	});
});
