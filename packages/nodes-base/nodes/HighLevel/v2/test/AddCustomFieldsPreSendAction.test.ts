import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { addCustomFieldsPreSendAction } from '../GenericFunctions';

describe('addCustomFieldsPreSendAction', () => {
	let mockThis: IExecuteSingleFunctions;

	beforeEach(() => {
		mockThis = {
			getNode: vi.fn().mockReturnValue({ name: 'HighLevel' }),
		} as unknown as IExecuteSingleFunctions;
	});

	it('should format custom fields as HighLevel { id, fieldValue } entries', async () => {
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

		const result = await addCustomFieldsPreSendAction.call(mockThis, mockRequestOptions);

		expect((result.body as IDataObject).customFields).toEqual([
			{ id: '123', fieldValue: 'TestValue' },
			{ id: '456', fieldValue: 'AnotherValue' },
		]);
	});

	// n8n-io/n8n#35392: Update used a resource locator plus the nested routing
	// expression, which produced `{ fieldId: { id }, field_value }` instead of
	// the `{ id, fieldValue }` body HighLevel accepts.
	it('should remap resource-locator and legacy field_value shapes', async () => {
		const mockRequestOptions: IHttpRequestOptions = {
			body: {
				customFields: [
					{
						fieldId: {
							__rl: true,
							value: 'custom-field-id',
							mode: 'list',
							cachedResultName: 'Resumo',
						},
						fieldValue: 'teste',
					},
					{
						fieldId: { id: 'legacy-field-id' },
						field_value: 'legacy-value',
					},
				],
			} as IDataObject,
			url: '',
		};

		const result = await addCustomFieldsPreSendAction.call(mockThis, mockRequestOptions);

		expect((result.body as IDataObject).customFields).toEqual([
			{ id: 'custom-field-id', fieldValue: 'teste' },
			{ id: 'legacy-field-id', fieldValue: 'legacy-value' },
		]);
	});

	it('should accept a plain string field id from an expression', async () => {
		const mockRequestOptions: IHttpRequestOptions = {
			body: {
				customFields: {
					values: [{ fieldId: 'string-field-id', fieldValue: 'plain' }],
				},
			} as IDataObject,
			url: '',
		};

		const result = await addCustomFieldsPreSendAction.call(mockThis, mockRequestOptions);

		expect((result.body as IDataObject).customFields).toEqual([
			{ id: 'string-field-id', fieldValue: 'plain' },
		]);
	});

	it('should not modify request body if customFields is not provided', async () => {
		const mockRequestOptions: IHttpRequestOptions = {
			body: {
				otherField: 'SomeValue',
			} as IDataObject,
			url: '',
		};

		const result = await addCustomFieldsPreSendAction.call(mockThis, mockRequestOptions);

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

		const result = await addCustomFieldsPreSendAction.call(mockThis, mockRequestOptions);

		expect((result.body as IDataObject).customFields).toEqual([]);
	});

	it('should throw when a custom field has no usable id', async () => {
		const mockRequestOptions: IHttpRequestOptions = {
			body: {
				customFields: {
					values: [{ fieldId: {}, fieldValue: 'missing-id' }],
				},
			} as IDataObject,
			url: '',
		};

		await expect(addCustomFieldsPreSendAction.call(mockThis, mockRequestOptions)).rejects.toThrow(
			NodeOperationError,
		);
	});
});
