/**
 * @jest-environment jsdom
 */

import type { ExtensionMap } from './Extensions';

function format(value: number, extraArgs: unknown[]): string {
	const [locales = 'en-US', config = {}] = extraArgs as [
		string | string[],
		Intl.NumberFormatOptions,
	];

	return new Intl.NumberFormat(locales, config).format(value);
}

function isEven(value: number) {
	return value % 2 === 0;
}

function isOdd(value: number) {
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
	description: 'Rounds up a number to a whole number',
	returnType: 'number',
};

floor.doc = {
	name: 'floor',
	description: 'Rounds down a number to a whole number',
	returnType: 'number',
};

isEven.doc = {
	name: 'isEven',
	description: 'Returns true if the number is even. Only works on whole numbers.',
	returnType: 'boolean',
};

isOdd.doc = {
	name: 'isOdd',
	description: 'Returns true if the number is odd. Only works on whole numbers.',
	returnType: 'boolean',
};

// @TODO_NEXT_PHASE: Surface extensions below which take args

format.doc = {
	name: 'format',
	returnType: 'string',
};

round.doc = {
	name: 'round',
	returnType: 'number',
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
