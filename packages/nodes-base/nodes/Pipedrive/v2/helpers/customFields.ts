import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { setSafeObjectProperty } from 'n8n-workflow';

import type { ICustomProperties, ICustomInterface } from '../transport';

/** Pipedrive custom field keys are 40-character hashes. Default fields have readable keys. */
const CUSTOM_FIELD_KEY = /^[0-9a-f]{40}$/;

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
 * Reads from `item.json.custom_fields`, resolves in-place keeping nested structure.
 */
export function resolveCustomFieldsV2(
	customProperties: ICustomProperties,
	item: INodeExecutionData,
): void {
	const json = item.json as IDataObject;
	const customFields = json.custom_fields as IDataObject | undefined;

	if (!customFields || typeof customFields !== 'object') {
		return;
	}

	const resolved: IDataObject = {};

	for (const [key, value] of Object.entries(customFields)) {
		if (customProperties[key] === undefined) {
			resolved[key] = value;
			continue;
		}

		const customPropertyData = customProperties[key];

		if (value === null) {
			resolved[customPropertyData.name] = value;
			continue;
		}

		if ((PASSTHROUGH_FIELD_TYPES as readonly string[]).includes(customPropertyData.field_type)) {
			resolved[customPropertyData.name] = value;
		} else if (
			['enum', 'visible_to'].includes(customPropertyData.field_type) &&
			customPropertyData.options
		) {
			const propertyOption = customPropertyData.options.find(
				(option) => option.id.toString() === value?.toString(),
			);
			if (propertyOption !== undefined) {
				resolved[customPropertyData.name] = propertyOption.label;
			} else {
				resolved[customPropertyData.name] = value;
			}
		} else if (customPropertyData.field_type === 'set' && customPropertyData.options) {
			const ids: string[] = Array.isArray(value)
				? (value as string[]).map(String)
				: String(value).split(',');
			const selectedLabels = customPropertyData.options
				.filter((option) => ids.includes(option.id.toString()))
				.map((option) => option.label);
			resolved[customPropertyData.name] = selectedLabels;
		} else {
			resolved[customPropertyData.name] = value;
		}
	}

	json.custom_fields = resolved;
	item.json = json;
}

/**
 * The v1 Leads endpoint (used for lead create/update) expects custom fields as
 * top-level 40-char keys, not nested under a `custom_fields` object. Moves the
 * encoded custom fields from `body.custom_fields` to the root of the body.
 */
export function flattenCustomFieldsToRoot(body: IDataObject): void {
	const customFields = body.custom_fields;
	if (!customFields || typeof customFields !== 'object') {
		return;
	}

	for (const [key, value] of Object.entries(customFields as IDataObject)) {
		// The v1 format for a multi-option field is a comma-separated list of option IDs.
		setSafeObjectProperty(body, key, Array.isArray(value) ? value.join(',') : value);
	}
	delete body.custom_fields;
}

/**
 * /leadFields lists the default lead fields (title, value, owner_id, ...) and the custom
 * fields. Keeps only the custom fields, so a custom field name such as "Value" cannot
 * resolve to a default field and overwrite it in the request body.
 */
export function leadCustomFieldsOnly(customProperties: ICustomProperties): ICustomProperties {
	const customFields: ICustomProperties = {};
	for (const [key, data] of Object.entries(customProperties)) {
		if (CUSTOM_FIELD_KEY.test(key)) {
			customFields[key] = data;
		}
	}
	return customFields;
}

/**
 * The v1 Leads endpoint returns custom fields as top-level 40-char keys. Moves
 * the known custom field keys under `custom_fields` so the shared resolver can
 * map them to human-readable names, keeping lead output consistent with other
 * v2 resources.
 */
export function nestRootCustomFields(
	customProperties: ICustomProperties,
	item: INodeExecutionData,
): void {
	const json = item.json as IDataObject;
	const customFields = (json.custom_fields as IDataObject) ?? {};

	for (const key of Object.keys(json)) {
		// /leadFields also lists the default fields (title, owner_id, ...). Only 40-char
		// hash keys are custom fields, so the default fields stay at the root.
		if (CUSTOM_FIELD_KEY.test(key) && customProperties[key] !== undefined) {
			customFields[key] = json[key];
			delete json[key];
		}
	}

	if (Object.keys(customFields).length > 0) {
		json.custom_fields = customFields;
	}
	item.json = json;
}
