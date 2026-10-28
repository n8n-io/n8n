import { json as generateJsonSchema } from 'generate-schema';
import type { JSONSchema7 } from 'json-schema';

import { UserError } from './errors/base/user.error';
import { isSafeObjectProperty } from './utils';

function omitUnsafeProperties(key: string, value: unknown) {
	return isSafeObjectProperty(key) && !Object.hasOwn(Object.prototype, key) ? value : undefined;
}

/**
 * Generates a JSON Schema from an example while omitting reserved object properties.
 */
export function generateSchemaFromExample(exampleJson: string): JSONSchema7 {
	let parsedExample: unknown;
	try {
		parsedExample = JSON.parse(exampleJson, omitUnsafeProperties);
	} catch (error) {
		throw new UserError('The JSON example is not valid JSON', { cause: error });
	}

	return generateJsonSchema(parsedExample) as JSONSchema7;
}
