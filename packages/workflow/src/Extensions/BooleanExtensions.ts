import type { ExtensionMap } from './Extensions';

export function toBoolean(value: boolean) {
	return value;
}

export function toInt(value: boolean) {
	return value ? 1 : 0;
}

export function toFloat(value: boolean) {
	return value ? 1 : 0;
}

export function toDateTime() {
	return undefined;
}

toInt.doc = {
	name: 'toInt',
	description: 'Converts a boolean to an integer. `false` is 0, `true` is 1.',
	section: 'cast',
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/booleans/#boolean-toInt',
};

export const booleanExtensions: ExtensionMap = {
	typeName: 'Boolean',
	functions: {
		toBoolean,
		toInt,
		toFloat,
		toDateTime,
	},
};
