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

export const numberExtensions: ExtensionMap = {
	typeName: 'Number',
	functions: {
		format,
		random,
		isBlank,
		isPresent,
	},
};
