/**
 * @jest-environment jsdom
 */

import { ExtensionMap } from './Extensions';

function format(value: number, extraArgs: unknown[]): string {
	const [locales = 'en-US', config = {}] = extraArgs as [
		string | string[],
		Intl.NumberFormatOptions,
	];

	return new Intl.NumberFormat(locales, config).format(value);
}

function isBlank(value: number): boolean {
	return typeof value !== 'number';
}

function isPresent(value: number): boolean {
	return !isBlank(value);
}

function random(value: number): number {
	return Math.floor(Math.random() * value);
}

function isTrue(value: number) {
	return value === 1;
}

function isFalse(value: number) {
	return value === 0;
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

export const numberExtensions: ExtensionMap = {
	typeName: 'Number',
	functions: {
		ceil,
		floor,
		format,
		random,
		round,
		isBlank,
		isPresent,
		isTrue,
		isNotTrue: isFalse,
		isFalse,
		isEven,
		isOdd,
	},
};
