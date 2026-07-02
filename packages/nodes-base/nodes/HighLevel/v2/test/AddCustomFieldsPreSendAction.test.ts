import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { addCustomFieldsPreSendAction } from '../GenericFunctions';

describe('addCustomFieldsPreSendAction', () => {
	let mockThis: any;

	beforeEach(() => {
		mockThis = {
			helpers: {
				httpRequest: vi.fn(),
				httpRequestWithAuthentication: vi.fn(),
				requestWithAuthenticationPaginated: vi.fn(),
				request: vi.fn(),
				requestWithAuthentication: vi.fn(),
				requestOAuth1: vi.fn(),
				requestOAuth2: vi.fn(),
				assertBinaryData: vi.fn(),
				getBinaryDataBuffer: vi.fn(),
				prepareBinaryData: vi.fn(),
				setBinaryDataBuffer: vi.fn(),
				copyBinaryFile: vi.fn(),
				binaryToBuffer: vi.fn(),
				binaryToString: vi.fn(),
				getBinaryPath: vi.fn(),
				getBinaryStream: vi.fn(),
				getBinaryMetadata: vi.fn(),
				createDeferredPromise: vi
					.fn()
					.mockReturnValue({ promise: Promise.resolve(), resolve: vi.fn(), reject: vi.fn() }),
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
