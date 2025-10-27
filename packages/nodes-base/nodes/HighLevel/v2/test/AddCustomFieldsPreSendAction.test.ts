import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { addCustomFieldsPreSendAction } from '../GenericFunctions';

describe('addCustomFieldsPreSendAction', () => {
	let mockThis: any;

	beforeEach(() => {
		mockThis = {
			helpers: {
				httpRequest: jest.fn(),
				httpRequestWithAuthentication: jest.fn(),
				requestWithAuthenticationPaginated: jest.fn(),
				request: jest.fn(),
				requestWithAuthentication: jest.fn(),
				requestOAuth1: jest.fn(),
				requestOAuth2: jest.fn(),
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
				prepareBinaryData: jest.fn(),
				setBinaryDataBuffer: jest.fn(),
				copyBinaryFile: jest.fn(),
				binaryToBuffer: jest.fn(),
				binaryToString: jest.fn(),
				getBinaryPath: jest.fn(),
				getBinaryStream: jest.fn(),
				getBinaryMetadata: jest.fn(),
				createDeferredPromise: jest
					.fn()
					.mockReturnValue({ promise: Promise.resolve(), resolve: jest.fn(), reject: jest.fn() }),
			},
		};
	});

	it('should format custom fields correctly when provided', async () => {
		const mockRequestOptions: IHttpRequestOptions = {
			body: {
				customFields: {
					values: [
						{
							fieldId: { value: '123', cachedResultName: 'FieldName' },
							fieldValue: 'TestValue',
						},
						{
							fieldId: { value: '456' },
							fieldValue: 'AnotherValue',
						},
					],
				},
			} as IDataObject,
			url: '',
		};

		const result = await addCustomFieldsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			mockRequestOptions,
		);

		expect((result.body as IDataObject).customFields).toEqual([
			{ id: '123', key: 'FieldName', field_value: 'TestValue' },
			{ id: '456', key: 'default_key', field_value: 'AnotherValue' },
		]);
	});

	it('should not modify request body if customFields is not provided', async () => {
		const mockRequestOptions: IHttpRequestOptions = {
			body: {
				otherField: 'SomeValue',
			} as IDataObject,
			url: '',
		};

		const result = await addCustomFieldsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			mockRequestOptions,
		);

		expect(result).toEqual(mockRequestOptions);
	});

	it('should handle customFields with empty values', async () => {
		const mockRequestOptions: IHttpRequestOptions = {
			body: {
				customFields: {
					values: [],
				},
			} as IDataObject,
			url: '',
		};

		const result = await addCustomFieldsPreSendAction.call(
			mockThis as IExecuteSingleFunctions,
			mockRequestOptions,
		);

		expect((result.body as IDataObject).customFields).toEqual([]);
	});
});
