/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/no-cycle
import { ExpressionError } from '../ExpressionError';
import { ExtensionMap } from './Extensions';
// import { BaseExtension, ExtensionMethodHandler } from './Extensions';

function filter(value: any[], extraArgs?: any[]): any[] {
	if (!Array.isArray(extraArgs)) {
		throw new ExpressionError('arguments must be passed to filter');
	}
	const terms = extraArgs as string[] | number[];
	return value.filter((v: string | number) => (terms as Array<typeof v>).includes(v));
}

function first(value: any[]): any {
	return value[0];
}

function isBlank(value: any[]): boolean {
	return value.length === 0;
}

function isPresent(value: any[]): boolean {
	return value.length > 0;
}

function last(value: any[]): any {
	return value[value.length - 1];
}

function length(value: any[]): number {
	return Array.isArray(value) ? value.length : 0;
}

function pluck(value: any[], extraArgs: any[]): any[] {
	if (!Array.isArray(extraArgs)) {
		throw new ExpressionError('arguments must be passed to pluck');
	}
	const fieldsToPluck = extraArgs;
	return value.map((element: object) => {
		const entries = Object.entries(element);
		return entries.reduce((p, c) => {
			const [key, val] = c as [string, Date | string | number];
			if (fieldsToPluck.includes(key)) {
				Object.assign(p, { [key]: val });
			}
			return p;
		}, {});
	});
}

function random(value: any[]): any {
	const len = value === undefined ? 0 : value.length;
	return len ? value[Math.floor(Math.random() * len)] : undefined;
}

function unique(value: any[]): any[] {
	return Array.from(new Set(value));
}

export const arrayExtensions: ExtensionMap = {
	typeName: 'Array',
	functions: {
		count: length,
		duplicates: unique,
		filter,
		first,
		last,
		length,
		pluck,
		unique,
		random,
		randomItem: random,
		remove: unique,
		size: length,
		isPresent,
		isBlank,
	},
};
