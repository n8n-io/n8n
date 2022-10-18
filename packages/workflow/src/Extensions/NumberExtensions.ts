import { ExtensionMap } from './Extensions';

function format(value: number, extraArgs: unknown[]): string {
	const [locales = 'en-US', config] = extraArgs as [
		string | string[],
		{ compactDisplay: string; notation: string; style: string },
	];

	return new Intl.NumberFormat(locales, {
		...config,
		notation: 'compact',
		compactDisplay: 'short',
		style: 'decimal',
	}).format(value);
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
