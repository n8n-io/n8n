import type { IExecuteSingleFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';

import { validEmailAndPhonePreSendAction, isEmailValid, isPhoneValid } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	isEmailValid: jest.fn(),
	isPhoneValid: jest.fn(),
}));

describe('validEmailAndPhonePreSendAction', () => {
	let mockThis: IExecuteSingleFunctions;

	beforeEach(() => {
		mockThis = {
			getNode: jest.fn(
				() =>
					({
						id: 'mock-node-id',
						name: 'mock-node',
						typeVersion: 1,
						type: 'n8n-nodes-base.mockNode',
						position: [0, 0],
						parameters: {},
					}) as INode,
			),
		} as unknown as IExecuteSingleFunctions;

		jest.clearAllMocks();
	});

	it('should return requestOptions unchanged if email and phone are valid', async () => {
		(isEmailValid as jest.Mock).mockReturnValue(true);
		(isPhoneValid as jest.Mock).mockReturnValue(true);

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {
				email: 'valid@example.com',
				phone: '+1234567890',
			},
		};

		const result = await validEmailAndPhonePreSendAction.call(mockThis, requestOptions);

		expect(result).toEqual(requestOptions);
	});

	it('should not modify requestOptions if no email or phone is provided', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await validEmailAndPhonePreSendAction.call(mockThis, requestOptions);

		expect(result).toEqual(requestOptions);
	});

	it('should not modify requestOptions if body is undefined', async () => {
		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: undefined,
		};

		const result = await validEmailAndPhonePreSendAction.call(mockThis, requestOptions);

		expect(result).toEqual(requestOptions);
	});
});
