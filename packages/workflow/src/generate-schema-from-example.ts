import { json as generateJsonSchema } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';

import { isSafeObjectProperty } from './utils';

function omitUnsafeProperties(key: string, value: unknown) {
	return isSafeObjectProperty(key) && !Object.hasOwn(Object.prototype, key) ? value : undefined;
}

/**
 * Generates a JSON Schema from an example while omitting reserved object properties.
 */
export function generateSchemaFromExample(exampleJson: string): JSONSchema7 {
	const parsedExample: unknown = JSON.parse(exampleJson, omitUnsafeProperties);

	return generateJsonSchema(parsedExample) as JSONSchema7;
}
