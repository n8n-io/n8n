import { coerceToNumber } from './typeCoercion';
/**
 * Copies fields from an additionalFields/updateFields collection into the request body.
 * Handles the `customFields` fixed-collection by unpacking its `property` array
 * into individual key-value pairs on the body.
 */
export function addFieldsToBody(body, fields) {
    for (const key of Object.keys(fields)) {
        if (key === 'customFields' && fields.customFields?.property !== undefined) {
            const customFieldsObj = body.custom_fields ?? {};
            for (const customProperty of fields.customFields.property) {
                customFieldsObj[customProperty.name] = customProperty.value;
            }
            body.custom_fields = customFieldsObj;
        }
        else {
            body[key] = fields[key];
        }
    }
    // visible_to comes as string from the UI options but the API expects a number
    if (body.visible_to !== undefined) {
        body.visible_to = coerceToNumber(body.visible_to);
    }
}
//# sourceMappingURL=fields.js.map