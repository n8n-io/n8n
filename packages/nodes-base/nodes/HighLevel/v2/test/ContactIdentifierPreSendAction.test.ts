import type { IExecuteSingleFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';

import { contactIdentifierPreSendAction, isEmailValid, isPhoneValid } from '../GenericFunctions';
import type { Mock } from 'vitest';
import type * as _importType0 from '../GenericFunctions';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	isEmailValid: vi.fn(),
	isPhoneValid: vi.fn(),
}));

describe('contactIdentifierPreSendAction', () => {
	let mockThis: Partial<IExecuteSingleFunctions>;

	beforeEach(() => {
		mockThis = {
			getNode: vi.fn(
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
			getNodeParameter: vi.fn((parameterName: string) => {
				if (parameterName === 'contactIdentifier') return null;
				if (parameterName === 'updateFields') return { contactIdentifier: 'default-identifier' };
				return undefined;
			}),
		};
	});

	it('should add email to requestOptions.body if identifier is a valid email', async () => {
		(isEmailValid as Mock).mockReturnValue(true);
		(isPhoneValid as Mock).mockReturnValue(false);
		(mockThis.getNodeParameter as Mock).mockReturnValue('valid@example.com'); // Mock email

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
		(isEmailValid as Mock).mockReturnValue(false);
		(isPhoneValid as Mock).mockReturnValue(true);
		(mockThis.getNodeParameter as Mock).mockReturnValue('1234567890'); // Mock phone

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
		(isEmailValid as Mock).mockReturnValue(false);
		(isPhoneValid as Mock).mockReturnValue(false);
		(mockThis.getNodeParameter as Mock).mockReturnValue('contact-id-123'); // Mock contactId

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
		(isEmailValid as Mock).mockReturnValue(true);
		(isPhoneValid as Mock).mockReturnValue(false);

		(mockThis.getNodeParameter as Mock).mockImplementation((parameterName: string) => {
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
		(isEmailValid as Mock).mockReturnValue(false);
		(isPhoneValid as Mock).mockReturnValue(false);
		(mockThis.getNodeParameter as Mock).mockReturnValue('identifier-123');

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
