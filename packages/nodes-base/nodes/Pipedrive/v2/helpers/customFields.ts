import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import type { ICustomProperties, ICustomInterface } from '../transport';

/** Field types that are passed through without enum/set resolution in resolve functions. */
const PASSTHROUGH_FIELD_TYPES = [
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
] as const;

/** Build a lookup map from custom property display name to its property data. */
function buildNameMap(customProperties: ICustomProperties): Map<string, ICustomInterface> {
	const map = new Map<string, ICustomInterface>();
	for (const propertyData of Object.values(customProperties)) {
		map.set(propertyData.name, propertyData);
	}
	return map;
}

/**
 * Encodes human-readable custom field names to Pipedrive API keys for v2 endpoints.
 * Places custom fields under `item.custom_fields = { key: value }`.
 */
export function encodeCustomFieldsV2(customProperties: ICustomProperties, item: IDataObject): void {
	const nameMap = buildNameMap(customProperties);
	const inputFields = (item.custom_fields as IDataObject) ?? {};
	const resolved: IDataObject = {};

	for (const [key, value] of Object.entries(inputFields)) {
		// Look up by display name first, then by raw field key
		const customPropertyData = nameMap.get(key) ?? customProperties[key];

		if (customPropertyData !== undefined) {
			if (
				value !== null &&
				value !== undefined &&
				customPropertyData.options !== undefined &&
				Array.isArray(customPropertyData.options)
			) {
				if (customPropertyData.field_type === 'set') {
					// Set fields: resolve each label to its option ID
					const labels: string[] = Array.isArray(value)
						? (value as string[]).map(String)
						: String(value)
								.split(',')
								.map((s) => s.trim());
					const ids = labels.map((label) => {
						const opt = customPropertyData.options!.find(
							(option) => option.label.toString() === label,
						);
						return opt !== undefined ? opt.id : label;
					});
					resolved[customPropertyData.key] = ids;
				} else {
					// Enum / visible_to: resolve single label to option ID
					const propertyOption = customPropertyData.options.find(
						(option) => option.label.toString() === value!.toString(),
					);
					if (propertyOption !== undefined) {
						resolved[customPropertyData.key] = propertyOption.id;
					} else {
						resolved[customPropertyData.key] = value;
					}
				}
			} else {
				resolved[customPropertyData.key] = value;
			}
		} else {
			// Unknown key — pass through as-is
			resolved[key] = value;
		}
	}

	if (Object.keys(resolved).length > 0) {
		item.custom_fields = resolved;
	} else {
		delete item.custom_fields;
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

		if ((PASSTHROUGH_FIELD_TYPES as readonly string[]).includes(customPropertyData.field_type)) {
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
