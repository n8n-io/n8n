import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { encodeCustomFieldsV2, resolveCustomFieldsV2 } from '../../v2/helpers/customFields';
import { coerceToBoolean } from '../../v2/helpers/typeCoercion';
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
		it('should place custom fields under custom_fields key', () => {
			const item: IDataObject = {
				title: 'Test Deal',
				'My Custom Text': 'Hello World',
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.title).toBe('Test Deal');
			expect(item['My Custom Text']).toBeUndefined();
			expect(item.custom_fields).toEqual({
				abc123_text: 'Hello World',
			});
		});

		it('should resolve enum labels to option IDs', () => {
			const item: IDataObject = {
				'My Custom Enum': 'Option B',
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				def456_enum: 20,
			});
		});

		it('should keep value as-is if enum label not found', () => {
			const item: IDataObject = {
				'My Custom Enum': 'Unknown Option',
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				def456_enum: 'Unknown Option',
			});
		});

		it('should handle null values', () => {
			const item: IDataObject = {
				'My Custom Text': null,
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				abc123_text: null,
			});
		});

		it('should not create custom_fields key if no custom fields present', () => {
			const item: IDataObject = {
				title: 'Test Deal',
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toBeUndefined();
			expect(item.title).toBe('Test Deal');
		});

		it('should handle multiple custom fields', () => {
			const item: IDataObject = {
				'My Custom Text': 'Hello',
				'My Custom Enum': 'Option A',
				'My Number': 42.5,
			};

			encodeCustomFieldsV2(customProperties, item);

			expect(item.custom_fields).toEqual({
				abc123_text: 'Hello',
				def456_enum: 10,
				mno345_double: 42.5,
			});
		});
	});

	describe('resolveCustomFieldsV2', () => {
		it('should read from nested custom_fields and flatten to root', () => {
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

			expect(item.json['My Custom Text']).toBe('Hello World');
			expect(item.json.custom_fields).toBeUndefined();
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

			expect(item.json['My Custom Enum']).toBe('Option B');
			expect(item.json.custom_fields).toBeUndefined();
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

			expect(item.json['My Custom Set']).toEqual(['Tag One', 'Tag Three']);
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

			expect(item.json['My Custom Set']).toEqual(['Tag One', 'Tag Three']);
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

			expect(item.json['My Custom Text']).toBeNull();
			expect(item.json.custom_fields).toBeUndefined();
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

			expect(item.json.Visibility).toBe('Entire company');
		});

		it('should preserve unknown custom field keys', () => {
			const item: INodeExecutionData = {
				json: {
					custom_fields: {
						unknown_key: 'some value',
					},
				},
			};

			resolveCustomFieldsV2(customProperties, item);

			expect(item.json.unknown_key).toBe('some value');
			expect(item.json.custom_fields).toBeUndefined();
		});
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
});
