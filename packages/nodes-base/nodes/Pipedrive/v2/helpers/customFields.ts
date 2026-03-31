import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import type { ICustomProperties } from '../transport';

/**
 * Encodes human-readable custom field names to Pipedrive API keys for v2 endpoints.
 * Places custom fields under `item.custom_fields = { key: value }`.
 */
export function encodeCustomFieldsV2(customProperties: ICustomProperties, item: IDataObject): void {
	const customFields: IDataObject = {};

	for (const key of Object.keys(item)) {
		const customPropertyData = Object.values(customProperties).find(
			(propertyData) => propertyData.name === key,
		);

		if (customPropertyData !== undefined) {
			if (
				item[key] !== null &&
				item[key] !== undefined &&
				customPropertyData.options !== undefined &&
				Array.isArray(customPropertyData.options)
			) {
				const propertyOption = customPropertyData.options.find(
					(option) => option.label.toString() === item[key]!.toString(),
				);
				if (propertyOption !== undefined) {
					customFields[customPropertyData.key] = propertyOption.id;
				} else {
					customFields[customPropertyData.key] = item[key];
				}
			} else {
				customFields[customPropertyData.key] = item[key];
			}
			delete item[key];
		}
	}

	if (Object.keys(customFields).length > 0) {
		item.custom_fields = customFields;
	}
}

/**
 * Encodes human-readable custom field names to Pipedrive API keys for v1 endpoints.
 * Places custom fields at the root level of the item.
 */
export function encodeCustomFieldsV1(customProperties: ICustomProperties, item: IDataObject): void {
	for (const key of Object.keys(item)) {
		const customPropertyData = Object.values(customProperties).find(
			(propertyData) => propertyData.name === key,
		);

		if (customPropertyData !== undefined) {
			if (
				item[key] !== null &&
				item[key] !== undefined &&
				customPropertyData.options !== undefined &&
				Array.isArray(customPropertyData.options)
			) {
				const propertyOption = customPropertyData.options.find(
					(option) => option.label.toString() === item[key]!.toString(),
				);
				if (propertyOption !== undefined) {
					item[customPropertyData.key] = propertyOption.id;
				} else {
					item[customPropertyData.key] = item[key];
				}
			} else {
				item[customPropertyData.key] = item[key];
			}
			delete item[key];
		}
	}
}

/**
 * Resolves custom field keys from v2 API response to human-readable names.
 * Reads from `item.json.custom_fields`, flattens into root, deletes `custom_fields` key.
 */
export function resolveCustomFieldsV2(
	customProperties: ICustomProperties,
	item: INodeExecutionData,
): void {
	const json = item.json as IDataObject;
	const customFields = json.custom_fields as IDataObject | undefined;

	if (!customFields || typeof customFields !== 'object') {
		delete json.custom_fields;
		item.json = json;
		return;
	}

	for (const [key, value] of Object.entries(customFields)) {
		if (customProperties[key] === undefined) {
			json[key] = value;
			continue;
		}

		const customPropertyData = customProperties[key];

		if (value === null) {
			json[customPropertyData.name] = value;
			continue;
		}

		if (
			[
				'date',
				'address',
				'double',
				'monetary',
				'org',
				'people',
				'phone',
				'text',
				'time',
				'user',
				'varchar',
				'varchar_auto',
				'int',
				'timerange',
			].includes(customPropertyData.field_type)
		) {
			json[customPropertyData.name] = value;
		} else if (
			['enum', 'visible_to'].includes(customPropertyData.field_type) &&
			customPropertyData.options
		) {
			const propertyOption = customPropertyData.options.find(
				(option) => option.id.toString() === value?.toString(),
			);
			if (propertyOption !== undefined) {
				json[customPropertyData.name] = propertyOption.label;
			} else {
				json[customPropertyData.name] = value;
			}
		} else if (customPropertyData.field_type === 'set' && customPropertyData.options) {
			const ids: string[] = Array.isArray(value)
				? (value as string[]).map(String)
				: String(value).split(',');
			const selectedLabels = customPropertyData.options
				.filter((option) => ids.includes(option.id.toString()))
				.map((option) => option.label);
			json[customPropertyData.name] = selectedLabels;
		} else {
			json[customPropertyData.name] = value;
		}
	}

	delete json.custom_fields;
	item.json = json;
}

/**
 * Resolves custom field keys from v1 API response to human-readable names.
 * Reads from `item.json` root, resolves keys to display names.
 */
export function resolveCustomFieldsV1(
	customProperties: ICustomProperties,
	item: INodeExecutionData,
): void {
	const json = item.json as IDataObject;

	for (const [key, value] of Object.entries(json)) {
		if (customProperties[key] === undefined) {
			continue;
		}

		const customPropertyData = customProperties[key];

		if (value === null) {
			json[customPropertyData.name] = value;
			delete json[key];
			continue;
		}

		if (
			[
				'date',
				'address',
				'double',
				'monetary',
				'org',
				'people',
				'phone',
				'text',
				'time',
				'user',
				'varchar',
				'varchar_auto',
				'int',
				'timerange',
			].includes(customPropertyData.field_type)
		) {
			json[customPropertyData.name] = value;
			delete json[key];
		} else if (
			['enum', 'visible_to'].includes(customPropertyData.field_type) &&
			customPropertyData.options
		) {
			const propertyOption = customPropertyData.options.find(
				(option) => option.id.toString() === value?.toString(),
			);
			if (propertyOption !== undefined) {
				json[customPropertyData.name] = propertyOption.label;
			} else {
				json[customPropertyData.name] = value;
			}
			delete json[key];
		} else if (
			customPropertyData.field_type === 'set' &&
			customPropertyData.options &&
			typeof value === 'string'
		) {
			const selectedIds = value.split(',');
			const selectedLabels = customPropertyData.options
				.filter((option) => selectedIds.includes(option.id.toString()))
				.map((option) => option.label);
			json[customPropertyData.name] = selectedLabels;
			delete json[key];
		}
	}

	item.json = json;
}
