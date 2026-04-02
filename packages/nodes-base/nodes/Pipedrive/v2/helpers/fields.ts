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
			for (const customProperty of (fields.customFields as IDataObject).property as Array<{
				name: string;
				value: string;
			}>) {
				body[customProperty.name] = customProperty.value;
			}
		} else {
			body[key] = fields[key];
		}
	}

	// visible_to comes as string from the UI options but the API expects a number
	if (body.visible_to !== undefined) {
		body.visible_to = coerceToNumber(body.visible_to);
	}
}
