/**
 * @jest-environment jsdom
 */
import { DateTime } from 'luxon';
import { ExpressionExtensionError } from '../errors/expression-extension.error';
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

function toBoolean(value: number) {
	return value !== 0;
}

function toInt(value: number) {
	return round(value, []);
}

function toFloat(value: number) {
	return value;
}

type DateTimeFormat = 'ms' | 's' | 'excel';
function toDateTime(value: number, extraArgs: [DateTimeFormat]) {
	const [valueFormat = 'ms'] = extraArgs;

	switch (valueFormat) {
		// Excel format is days since 1900
		// There is a bug where 1900 is incorrectly treated as a leap year
		case 'excel': {
			const DAYS_BETWEEN_1900_1970 = 25567;
			const DAYS_LEAP_YEAR_BUG_ADJUST = 2;
			const SECONDS_IN_DAY = 86_400;
			return DateTime.fromSeconds(
				(value - (DAYS_BETWEEN_1900_1970 + DAYS_LEAP_YEAR_BUG_ADJUST)) * SECONDS_IN_DAY,
			);
		}
		case 's':
			return DateTime.fromSeconds(value);
		case 'ms':
		default:
			return DateTime.fromMillis(value);
	}
}

ceil.doc = {
	name: 'ceil',
	description: 'Rounds up a number to a whole number.',
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-ceil',
};

floor.doc = {
	name: 'floor',
	description: 'Rounds down a number to a whole number.',
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-floor',
};

isEven.doc = {
	name: 'isEven',
	description: 'Returns true if the number is even. Only works on whole numbers.',
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-isEven',
};

isOdd.doc = {
	name: 'isOdd',
	description: 'Returns true if the number is odd. Only works on whole numbers.',
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-isOdd',
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
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-format',
};

round.doc = {
	name: 'round',
	description:
		'Returns the value of a number rounded to the nearest whole number, unless a decimal place is specified. Defaults to 0 decimal places if no argument is given.',
	returnType: 'number',
	args: [{ name: 'decimalPlaces?', type: 'number' }],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-round',
};

toBoolean.doc = {
	name: 'toBoolean',
	description: 'Converts a number to a boolean. 0 is `false`, all other numbers are `true`.',
	section: 'cast',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-toBoolean',
};

toDateTime.doc = {
	name: 'toDateTime',
	description:
		"Converts a number to a DateTime. Defaults to milliseconds. Format can be 'ms' (milliseconds), 's' (seconds) or 'excel' (Excel 1900 format).",
	section: 'cast',
	returnType: 'DateTime',
	args: [{ name: 'format?', type: 'string' }],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/numbers/#number-toDateTime',
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
		toBoolean,
		toInt,
		toFloat,
		toDateTime,
	},
};
