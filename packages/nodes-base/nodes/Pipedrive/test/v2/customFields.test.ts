import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { encodeCustomFieldsV2, resolveCustomFieldsV2 } from '../../v2/helpers/customFields';
import { addFieldsToBody } from '../../v2/helpers/fields';
import { coerceToBoolean, coerceToNumber, toRfc3339 } from '../../v2/helpers/typeCoercion';
import type { ICustomProperties } from '../../v2/transport';

const customProperties: ICustomProperties = {
	abc123_text: {
		name: 'My Custom Text',
		key: 'abc123_text',
		field_type: 'text',
	},
	def456_enum: {
		name: 'My Custom Enum',
		key: 'def456_enum',
		field_type: 'enum',
		options: [
			{ id: 10, label: 'Option A' },
			{ id: 20, label: 'Option B' },
			{ id: 30, label: 'Option C' },
		],
	},
	ghi789_set: {
		name: 'My Custom Set',
		key: 'ghi789_set',
		field_type: 'set',
		options: [
			{ id: 1, label: 'Tag One' },
			{ id: 2, label: 'Tag Two' },
			{ id: 3, label: 'Tag Three' },
		],
	},
	jkl012_visible: {
		name: 'Visibility',
		key: 'jkl012_visible',
		field_type: 'visible_to',
		options: [
			{ id: 1, label: 'Owner only' },
			{ id: 3, label: 'Entire company' },
		],
	},
	mno345_double: {
		name: 'My Number',
		key: 'mno345_double',
		field_type: 'double',
	},
};

describe('Pipedrive v2 Custom Fields', () => {
	describe('encodeCustomFieldsV2', () => {
		it('should resolve display names to API keys under custom_fields', () => {
			const item: IDataObject = {
				title: 'Test Deal',
				custom_fields: { 'My Custom Text': 'Hello World' },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.title).toBe('Test Deal');
			expect(item.custom_fields).toEqual({
				abc123_text: 'Hello World',
			});
		});

		it('should resolve enum labels to option IDs', () => {
			const item: IDataObject = {
				custom_fields: { 'My Custom Enum': 'Option B' },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				def456_enum: 20,
			});
		});

		it('should keep value as-is if enum label not found', () => {
			const item: IDataObject = {
				custom_fields: { 'My Custom Enum': 'Unknown Option' },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				def456_enum: 'Unknown Option',
			});
		});

		it('should handle null values', () => {
			const item: IDataObject = {
				custom_fields: { 'My Custom Text': null },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				abc123_text: null,
			});
		});

		it('should remove custom_fields key if no custom fields present', () => {
			const item: IDataObject = {
				title: 'Test Deal',
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toBeUndefined();
			expect(item.title).toBe('Test Deal');
		});

		it('should handle multiple custom fields', () => {
			const item: IDataObject = {
				custom_fields: {
					'My Custom Text': 'Hello',
					'My Custom Enum': 'Option A',
					'My Number': 42.5,
				},
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				abc123_text: 'Hello',
				def456_enum: 10,
				mno345_double: 42.5,
			});
		});

		it('should not touch built-in fields at root level', () => {
			const item: IDataObject = {
				name: 'Jane',
				emails: [{ value: 'jane@test.com' }],
				custom_fields: { 'My Custom Text': 'Hello' },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.name).toBe('Jane');
			expect(item.emails).toBeDefined();
			expect(item.custom_fields).toEqual({ abc123_text: 'Hello' });
		});

		it('should resolve set field labels to option IDs', () => {
			const item: IDataObject = {
				custom_fields: { 'My Custom Set': 'Tag One, Tag Three' },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({ ghi789_set: [1, 3] });
		});

		it('should resolve set field array labels to option IDs', () => {
			const item: IDataObject = {
				custom_fields: { 'My Custom Set': ['Tag One', 'Tag Three'] },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({ ghi789_set: [1, 3] });
		});

		it('should pass through unknown keys as-is', () => {
			const item: IDataObject = {
				custom_fields: { unknown_key: 'some value' },
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({ unknown_key: 'some value' });
		});
	});

	describe('resolveCustomFieldsV2', () => {
		it('should resolve custom_fields keys to human-readable names, keeping nested', () => {
			const item: INodeExecutionData = {
				json: {
					id: 1,
					title: 'Test Deal',
					custom_fields: {
						abc123_text: 'Hello World',
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.custom_fields).toEqual({ 'My Custom Text': 'Hello World' });
			expect(item.json.title).toBe('Test Deal');
		});

		it('should resolve enum option IDs to labels', () => {
			const item: INodeExecutionData = {
				json: {
					custom_fields: {
						def456_enum: 20,
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.custom_fields).toEqual({ 'My Custom Enum': 'Option B' });
		});

		it('should handle set fields as arrays', () => {
			const item: INodeExecutionData = {
				json: {
					custom_fields: {
						ghi789_set: [1, 3],
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.custom_fields).toEqual({ 'My Custom Set': ['Tag One', 'Tag Three'] });
		});

		it('should handle set fields as comma-separated strings', () => {
			const item: INodeExecutionData = {
				json: {
					custom_fields: {
						ghi789_set: '1,3',
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.custom_fields).toEqual({
				'My Custom Set': ['Tag One', 'Tag Three'],
			});
		});

		it('should handle null custom field values', () => {
			const item: INodeExecutionData = {
				json: {
					custom_fields: {
						abc123_text: null,
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.custom_fields).toEqual({ 'My Custom Text': null });
		});

		it('should handle missing custom_fields key', () => {
			const item: INodeExecutionData = {
				json: {
					id: 1,
					title: 'Test Deal',
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.id).toBe(1);
			expect(item.json.title).toBe('Test Deal');
		});

		it('should resolve visible_to field', () => {
			const item: INodeExecutionData = {
				json: {
					custom_fields: {
						jkl012_visible: 3,
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.custom_fields).toEqual({ Visibility: 'Entire company' });
		});

		it('should preserve unknown custom field keys under custom_fields', () => {
			const item: INodeExecutionData = {
				json: {
					custom_fields: {
						unknown_key: 'some value',
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.custom_fields).toEqual({ unknown_key: 'some value' });
		});
	});
});

describe('addFieldsToBody', () => {
	it('should nest custom fields under custom_fields key', () => {
		const body: IDataObject = {};
		addFieldsToBody(body, {
			customFields: { property: [{ name: 'Abc123 Hash', value: 'test' }] },
		});
		expect(body.custom_fields).toEqual({ 'Abc123 Hash': 'test' });
		expect((body as Record<string, unknown>)['Abc123 Hash']).toBeUndefined();
	});

	it('should merge multiple custom fields', () => {
		const body: IDataObject = {};
		addFieldsToBody(body, {
			customFields: {
				property: [
					{ name: 'Field A', value: 'value_a' },
					{ name: 'Field B', value: 'value_b' },
				],
			},
		});
		expect(body.custom_fields).toEqual({ 'Field A': 'value_a', 'Field B': 'value_b' });
	});

	it('should copy non-custom fields to root level', () => {
		const body: IDataObject = {};
		addFieldsToBody(body, { visible_to: '3', label: 'hot' });
		expect(body.visible_to).toBe(3);
		expect(body.label).toBe('hot');
		expect(body.custom_fields).toBeUndefined();
	});
});

describe('Pipedrive v2 Type Coercion', () => {
	describe('coerceToBoolean', () => {
		it('should return true for boolean true', () => {
			expect(coerceToBoolean(true)).toBe(true);
		});

		it('should return false for boolean false', () => {
			expect(coerceToBoolean(false)).toBe(false);
		});

		it('should return true for number 1', () => {
			expect(coerceToBoolean(1)).toBe(true);
		});

		it('should return false for number 0', () => {
			expect(coerceToBoolean(0)).toBe(false);
		});

		it('should return true for string "1"', () => {
			expect(coerceToBoolean('1')).toBe(true);
		});

		it('should return false for string "0"', () => {
			expect(coerceToBoolean('0')).toBe(false);
		});

		it('should return true for string "true"', () => {
			expect(coerceToBoolean('true')).toBe(true);
		});

		it('should return false for string "false"', () => {
			expect(coerceToBoolean('false')).toBe(false);
		});

		it('should handle case-insensitive "TRUE"', () => {
			expect(coerceToBoolean('TRUE')).toBe(true);
		});
	});

	describe('coerceToNumber', () => {
		it('should convert string numbers', () => {
			expect(coerceToNumber('42')).toBe(42);
			expect(coerceToNumber('3.14')).toBe(3.14);
		});
		it('should pass through numbers', () => {
			expect(coerceToNumber(42)).toBe(42);
		});
		it('should throw for non-numeric strings', () => {
			expect(() => coerceToNumber('abc')).toThrow('Cannot convert');
		});
	});

	describe('toRfc3339', () => {
		it('should convert v1 datetime format to RFC 3339', () => {
			expect(toRfc3339('2024-01-15 14:30:00')).toBe('2024-01-15T14:30:00.000Z');
		});
		it('should pass through RFC 3339 format unchanged', () => {
			expect(toRfc3339('2024-01-15T14:30:00Z')).toBe('2024-01-15T14:30:00Z');
		});
		it('should pass through date-only format unchanged', () => {
			expect(toRfc3339('2024-01-15')).toBe('2024-01-15');
		});
	});
});
