import type { IExecuteSingleFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';

import { contactIdentifierPreSendAction, isEmailValid, isPhoneValid } from '../GenericFunctions';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	isEmailValid: jest.fn(),
	isPhoneValid: jest.fn(),
}));

describe('contactIdentifierPreSendAction', () => {
	let mockThis: Partial<IExecuteSingleFunctions>;

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
			getNodeParameter: jest.fn((parameterName: string) => {
				if (parameterName === 'contactIdentifier') return null;
				if (parameterName === 'updateFields') return { contactIdentifier: 'default-identifier' };
				return undefined;
			}),
		};
	});

	it('should add email to requestOptions.body if identifier is a valid email', async () => {
		(isEmailValid as jest.Mock).mockReturnValue(true);
		(isPhoneValid as jest.Mock).mockReturnValue(false);
		(mockThis.getNodeParameter as jest.Mock).mockReturnValue('valid@example.com'); // Mock email

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await contactIdentifierPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({ email: 'valid@example.com' });
	});

	it('should add phone to requestOptions.body if identifier is a valid phone', async () => {
		(isEmailValid as jest.Mock).mockReturnValue(false);
		(isPhoneValid as jest.Mock).mockReturnValue(true);
		(mockThis.getNodeParameter as jest.Mock).mockReturnValue('1234567890'); // Mock phone

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await contactIdentifierPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({ phone: '1234567890' });
	});

	it('should add contactId to requestOptions.body if identifier is neither email nor phone', async () => {
		(isEmailValid as jest.Mock).mockReturnValue(false);
		(isPhoneValid as jest.Mock).mockReturnValue(false);
		(mockThis.getNodeParameter as jest.Mock).mockReturnValue('contact-id-123'); // Mock contactId

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await contactIdentifierPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({ contactId: 'contact-id-123' });
	});

	it('should use updateFields.contactIdentifier if contactIdentifier is not provided', async () => {
		(isEmailValid as jest.Mock).mockReturnValue(true);
		(isPhoneValid as jest.Mock).mockReturnValue(false);

		(mockThis.getNodeParameter as jest.Mock).mockImplementation((parameterName: string) => {
			if (parameterName === 'contactIdentifier') return null;
			if (parameterName === 'updateFields')
				return { contactIdentifier: 'default-email@example.com' };
			return undefined;
		});

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: {},
		};

		const result = await contactIdentifierPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({ email: 'default-email@example.com' });
	});

	it('should initialize body as an empty object if it is undefined', async () => {
		(isEmailValid as jest.Mock).mockReturnValue(false);
		(isPhoneValid as jest.Mock).mockReturnValue(false);
		(mockThis.getNodeParameter as jest.Mock).mockReturnValue('identifier-123');

		const requestOptions: IHttpRequestOptions = {
			url: 'https://example.com/api',
			body: undefined,
		};

		const result = await contactIdentifierPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			requestOptions,
		);

		expect(result.body).toEqual({ contactId: 'identifier-123' });
	});
});
