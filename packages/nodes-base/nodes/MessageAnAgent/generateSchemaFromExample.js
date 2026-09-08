import { json as generateJsonSchema } from 'generate-schema';
import { jsonParse } from 'n8n-workflow';
function makeAllPropertiesRequired(schema) {
    function isPropertySchema(property) {
        return typeof property === 'object' && property !== null && 'type' in property;
    }
    if (schema.type === 'object' && schema.properties) {
        const properties = Object.keys(schema.properties);
        if (properties.length > 0) {
            schema.required = properties;
        }
        for (const key of properties) {
            if (isPropertySchema(schema.properties[key])) {
                makeAllPropertiesRequired(schema.properties[key]);
            }
        }
    }
    if (schema.type === 'array' && schema.items && isPropertySchema(schema.items)) {
        schema.items = makeAllPropertiesRequired(schema.items);
    }
    return schema;
}
/**
 * Infer a JSON Schema from an example JSON string. When `allFieldsRequired`
 * is true, every object property (nested included) is marked required —
 * preferred for structured-output providers that reject optional fields.
 */
export function generateSchemaFromExample(exampleJsonString, allFieldsRequired = false) {
    const parsedExample = jsonParse(exampleJsonString);
    const schema = generateJsonSchema(parsedExample);
    delete schema.$schema;
    if (allFieldsRequired) {
        return makeAllPropertiesRequired(schema);
    }
    return schema;
}
//# sourceMappingURL=generateSchemaFromExample.js.map