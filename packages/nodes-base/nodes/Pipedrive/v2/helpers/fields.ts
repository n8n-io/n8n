import type { IDataObject } from 'n8n-workflow';

import { coerceToNumber } from './typeCoercion';

/**
 * Copies fields from an additionalFields/updateFields collection into the request body.
 * Handles the `customFields` fixed-collection by unpacking its `property` array
 * into individual key-value pairs on the body.
 */
export function addFieldsToBody(body: IDataObject, fields: IDataObject): void {
	for (const key of Object.keys(fields)) {
		if (key === 'customFields' && (fields.customFields as IDataObject)?.property !== undefined) {
			const customFieldsObj: IDataObject = (body.custom_fields as IDataObject) ?? {};
			for (const customProperty of (fields.customFields as IDataObject).property as Array<{
				name: string;
				value: string;
			}>) {
				customFieldsObj[customProperty.name] = customProperty.value;
			}
			body.custom_fields = customFieldsObj;
		} else {
			body[key] = fields[key];
		}
	}

	// visible_to comes as string from the UI options but the API expects a number
	if (body.visible_to !== undefined) {
		body.visible_to = coerceToNumber(body.visible_to);
	}
}

/**
 * The v2 organizations endpoint expects the address as an object. The node takes a
 * single line, so wrap it; Pipedrive geocodes `value` into the address parts.
 */
export function wrapOrganizationAddress(body: IDataObject): void {
	if (typeof body.address === 'string') {
		body.address = body.address === '' ? null : { value: body.address };
	}
}
