import type { Extension, ExtensionMap } from './Extensions';

export function toBoolean(value: boolean) {
	return value;
}

export function toInt(value: boolean) {
	return value ? 1 : 0;
}

export function toDateTime() {
	return undefined;
}

const toFloat = toInt;
const toNumber: Extension = toInt.bind({});

toNumber.doc = {
	name: 'toNumber',
	description:
		'Converts <code>true</code> to <code>1</code> and <code>false</code> to <code>0</code>.',
	examples: [
		{ example: 'true.toNumber()', evaluated: '1' },
		{ example: 'false.toNumber()', evaluated: '0' },
	],
	section: 'cast',
	returnType: 'number',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/booleans/#boolean-toNumber',
};

export const booleanExtensions: ExtensionMap = {
	typeName: 'Boolean',
	functions: {
		toBoolean,
		toInt,
		toFloat,
		toNumber,
		toDateTime,
	},
};
