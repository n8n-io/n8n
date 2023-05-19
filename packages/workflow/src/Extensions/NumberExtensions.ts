/**
 * @jest-environment jsdom
 */
import { ExpressionExtensionError } from './../ExpressionError';
import type { ExtensionMap } from './Extensions';

function format(value: number, extraArgs: unknown[]): string {
	const [locales = 'en-US', config = {}] = extraArgs as [
		string | string[],
		Intl.NumberFormatOptions,
	];

	return new Intl.NumberFormat(locales, config).format(value);
}

function isEven(value: number) {
	if (!Number.isInteger(value)) {
		throw new ExpressionExtensionError('isEven() is only callable on integers');
	}
	return value % 2 === 0;
}

function isOdd(value: number) {
	if (!Number.isInteger(value)) {
		throw new ExpressionExtensionError('isOdd() is only callable on integers');
	}
	return Math.abs(value) % 2 === 1;
}

function floor(value: number) {
	return Math.floor(value);
}

function ceil(value: number) {
	return Math.ceil(value);
}

function round(value: number, extraArgs: number[]) {
	const [decimalPlaces = 0] = extraArgs;
	return +value.toFixed(decimalPlaces);
}

ceil.doc = {
	name: 'ceil',
	description: 'Rounds up a number to a whole number.',
	returnType: 'number',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/numbers/#number-ceil',
};

floor.doc = {
	name: 'floor',
	description: 'Rounds down a number to a whole number.',
	returnType: 'number',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/numbers/#number-floor',
};

isEven.doc = {
	name: 'isEven',
	description: 'Returns true if the number is even. Only works on whole numbers.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/numbers/#number-isEven',
};

isOdd.doc = {
	name: 'isOdd',
	description: 'Returns true if the number is odd. Only works on whole numbers.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/numbers/#number-isOdd',
};

format.doc = {
	name: 'format',
	description:
		'Returns a formatted string of a number based on the given `LanguageCode` and `FormatOptions`. When no arguments are given, transforms the number in a like format `1.234`.',
	returnType: 'string',
	args: [
		{ name: 'locales?', type: 'LanguageCode' },
		{ name: 'options?', type: 'FormatOptions' },
	],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/numbers/#number-format',
};

round.doc = {
	name: 'round',
	description:
		'Returns the value of a number rounded to the nearest whole number. Defaults to 0 decimal places if no argument is given.',
	returnType: 'number',
	args: [{ name: 'decimalPlaces?', type: 'number' }],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/numbers/#number-round',
};

export const numberExtensions: ExtensionMap = {
	typeName: 'Number',
	functions: {
		ceil,
		floor,
		format,
		round,
		isEven,
		isOdd,
	},
};
