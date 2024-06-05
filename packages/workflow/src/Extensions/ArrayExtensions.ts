import { ExpressionError } from '../errors/expression.error';
import { ExpressionExtensionError } from '../errors/expression-extension.error';
import type { Extension, ExtensionMap } from './Extensions';
import { compact as oCompact } from './ObjectExtensions';
import deepEqual from 'deep-equal';
import uniqWith from 'lodash/uniqWith';

function first(value: unknown[]): unknown {
	return value[0];
}

function isEmpty(value: unknown[]): boolean {
	return value.length === 0;
}

function isNotEmpty(value: unknown[]): boolean {
	return value.length > 0;
}

function last(value: unknown[]): unknown {
	return value[value.length - 1];
}

function pluck(value: unknown[], extraArgs: unknown[]): unknown[] {
	if (!Array.isArray(extraArgs)) {
		throw new ExpressionError('arguments must be passed to pluck');
	}
	if (!extraArgs || extraArgs.length === 0) {
		return value;
	}
	const plucked = value.reduce<unknown[]>((pluckedFromObject, current) => {
		if (current && typeof current === 'object') {
			const p: unknown[] = [];
			Object.keys(current).forEach((k) => {
				(extraArgs as string[]).forEach((field) => {
					if (current && field === k) {
						p.push((current as { [key: string]: unknown })[k]);
					}
				});
			});
			if (p.length > 0) {
				pluckedFromObject.push(p.length === 1 ? p[0] : p);
			}
		}
		return pluckedFromObject;
	}, new Array<unknown>());
	return plucked;
}

function randomItem(value: unknown[]): unknown {
	const len = value === undefined ? 0 : value.length;
	return len ? value[Math.floor(Math.random() * len)] : undefined;
}

function unique(value: unknown[], extraArgs: string[]): unknown[] {
	const mapForEqualityCheck = (item: unknown): unknown => {
		if (extraArgs.length > 0 && item && typeof item === 'object') {
			return extraArgs.reduce<Record<string, unknown>>((acc, key) => {
				acc[key] = (item as Record<string, unknown>)[key];
				return acc;
			}, {});
		}
		return item;
	};
	return uniqWith(value, (a, b) =>
		deepEqual(mapForEqualityCheck(a), mapForEqualityCheck(b), { strict: true }),
	);
}

const ensureNumberArray = (arr: unknown[], { fnName }: { fnName: string }) => {
	if (arr.some((i) => typeof i !== 'number')) {
		throw new ExpressionExtensionError(`${fnName}(): all array elements must be numbers`);
	}
};

function sum(value: unknown[]): number {
	ensureNumberArray(value, { fnName: 'sum' });

	return value.reduce((p: number, c: unknown) => {
		if (typeof c === 'string') {
			return p + parseFloat(c);
		}
		if (typeof c !== 'number') {
			return NaN;
		}
		return p + c;
	}, 0);
}

function min(value: unknown[]): number {
	ensureNumberArray(value, { fnName: 'min' });

	return Math.min(
		...value.map((v) => {
			if (typeof v === 'string') {
				return parseFloat(v);
			}
			if (typeof v !== 'number') {
				return NaN;
			}
			return v;
		}),
	);
}

function max(value: unknown[]): number {
	ensureNumberArray(value, { fnName: 'max' });

	return Math.max(
		...value.map((v) => {
			if (typeof v === 'string') {
				return parseFloat(v);
			}
			if (typeof v !== 'number') {
				return NaN;
			}
			return v;
		}),
	);
}

export function average(value: unknown[]) {
	ensureNumberArray(value, { fnName: 'average' });

	// This would usually be NaN but I don't think users
	// will expect that
	if (value.length === 0) {
		return 0;
	}
	return sum(value) / value.length;
}

function compact(value: unknown[]): unknown[] {
	return value
		.filter((v) => {
			if (v && typeof v === 'object' && Object.keys(v).length === 0) return false;

			return v !== null && v !== undefined && v !== 'nil' && v !== '';
		})
		.map((v) => {
			if (typeof v === 'object' && v !== null) {
				return oCompact(v);
			}
			return v;
		});
}

function smartJoin(value: unknown[], extraArgs: string[]): object {
	const [keyField, valueField] = extraArgs;
	if (!keyField || !valueField || typeof keyField !== 'string' || typeof valueField !== 'string') {
		throw new ExpressionExtensionError(
			'smartJoin(): expected two string args, e.g. .smartJoin("name", "value")',
		);
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
	return value.reduce<any>((o, v) => {
		if (typeof v === 'object' && v !== null && keyField in v && valueField in v) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
			o[(v as any)[keyField]] = (v as any)[valueField];
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return o;
	}, {});
}

function chunk(value: unknown[], extraArgs: number[]) {
	const [chunkSize] = extraArgs;
	if (typeof chunkSize !== 'number' || chunkSize === 0) {
		throw new ExpressionExtensionError('chunk(): expected non-zero numeric arg, e.g. .chunk(5)');
	}
	const chunks: unknown[][] = [];
	for (let i = 0; i < value.length; i += chunkSize) {
		// I have no clue why eslint thinks 2 numbers could be anything but that but here we are

		chunks.push(value.slice(i, i + chunkSize));
	}
	return chunks;
}

function renameKeys(value: unknown[], extraArgs: string[]): unknown[] {
	if (extraArgs.length === 0 || extraArgs.length % 2 !== 0) {
		throw new ExpressionExtensionError(
			'renameKeys(): expected an even amount of args: from1, to1 [, from2, to2, ...]. e.g. .renameKeys("name", "title")',
		);
	}
	return value.map((v) => {
		if (typeof v !== 'object' || v === null) {
			return v;
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
		const newObj = { ...(v as any) };
		const chunkedArgs = chunk(extraArgs, [2]) as string[][];
		chunkedArgs.forEach(([from, to]) => {
			if (from in newObj) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				newObj[to] = newObj[from];
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				delete newObj[from];
			}
		});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return newObj;
	});
}

function mergeObjects(value: Record<string, unknown>, extraArgs: unknown[]): unknown {
	const [other] = extraArgs;

	if (!other) {
		return value;
	}

	if (typeof other !== 'object') {
		throw new ExpressionExtensionError('merge(): expected object arg');
	}

	const newObject = { ...value };
	for (const [key, val] of Object.entries(other)) {
		if (!(key in newObject)) {
			newObject[key] = val;
		}
	}
	return newObject;
}

function merge(value: unknown[], extraArgs: unknown[][]): unknown {
	const [others] = extraArgs;

	if (others === undefined) {
		// If there are no arguments passed, merge all objects within the array
		const merged = value.reduce((combined, current) => {
			if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
				combined = mergeObjects(combined as Record<string, unknown>, [current]);
			}
			return combined;
		}, {});
		return merged;
	}

	if (!Array.isArray(others)) {
		throw new ExpressionExtensionError(
			'merge(): expected array arg, e.g. .merge([{ id: 1, otherValue: 3 }])',
		);
	}
	const listLength = value.length > others.length ? value.length : others.length;
	let merged = {};
	for (let i = 0; i < listLength; i++) {
		if (value[i] !== undefined) {
			if (typeof value[i] === 'object' && typeof others[i] === 'object') {
				merged = Object.assign(
					merged,
					mergeObjects(value[i] as Record<string, unknown>, [others[i]]),
				);
			}
		}
	}
	return merged;
}

function union(value: unknown[], extraArgs: unknown[][]): unknown[] {
	const [others] = extraArgs;
	if (!Array.isArray(others)) {
		throw new ExpressionExtensionError('union(): expected array arg, e.g. .union([1, 2, 3, 4])');
	}
	const newArr: unknown[] = Array.from(value);
	for (const v of others) {
		if (newArr.findIndex((w) => deepEqual(w, v, { strict: true })) === -1) {
			newArr.push(v);
		}
	}
	return unique(newArr, []);
}

function difference(value: unknown[], extraArgs: unknown[][]): unknown[] {
	const [others] = extraArgs;
	if (!Array.isArray(others)) {
		throw new ExpressionExtensionError(
			'difference(): expected array arg, e.g. .difference([1, 2, 3, 4])',
		);
	}
	const newArr: unknown[] = [];
	for (const v of value) {
		if (others.findIndex((w) => deepEqual(w, v, { strict: true })) === -1) {
			newArr.push(v);
		}
	}
	return unique(newArr, []);
}

function intersection(value: unknown[], extraArgs: unknown[][]): unknown[] {
	const [others] = extraArgs;
	if (!Array.isArray(others)) {
		throw new ExpressionExtensionError(
			'intersection(): expected array arg, e.g. .intersection([1, 2, 3, 4])',
		);
	}
	const newArr: unknown[] = [];
	for (const v of value) {
		if (others.findIndex((w) => deepEqual(w, v, { strict: true })) !== -1) {
			newArr.push(v);
		}
	}
	for (const v of others) {
		if (value.findIndex((w) => deepEqual(w, v, { strict: true })) !== -1) {
			newArr.push(v);
		}
	}
	return unique(newArr, []);
}

function append(value: unknown[], extraArgs: unknown[][]): unknown[] {
	return value.concat(extraArgs);
}

export function toJsonString(value: unknown[]) {
	return JSON.stringify(value);
}

export function toInt() {
	return undefined;
}

export function toFloat() {
	return undefined;
}

export function toBoolean() {
	return undefined;
}

export function toDateTime() {
	return undefined;
}

average.doc = {
	name: 'average',
	description:
		'Returns the average of the numbers in the array. Throws an error if there are any non-numbers.',
	examples: [{ example: '[12, 1, 5].average()', evaluated: '6' }],
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-average',
};

compact.doc = {
	name: 'compact',
	description:
		'Removes any empty values from the array. <code>null</code>, <code>""</code> and <code>undefined</code> count as empty.',
	examples: [{ example: '[2, null, 1, ""].compact()', evaluated: '[2, 1]' }],
	returnType: 'Array',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-compact',
};

isEmpty.doc = {
	name: 'isEmpty',
	description: 'Returns <code>true</code> if the array has no elements',
	examples: [
		{ example: '[].isEmpty()', evaluated: 'true' },
		{ example: "['quick', 'brown', 'fox'].isEmpty()", evaluated: 'false' },
	],
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-isEmpty',
};

isNotEmpty.doc = {
	name: 'isNotEmpty',
	description: 'Returns <code>true</code> if the array has at least one element',
	examples: [
		{ example: "['quick', 'brown', 'fox'].isNotEmpty()", evaluated: 'true' },
		{ example: '[].isNotEmpty()', evaluated: 'false' },
	],
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-isNotEmpty',
};

first.doc = {
	name: 'first',
	description: 'Returns the first element of the array',
	examples: [{ example: "['quick', 'brown', 'fox'].first()", evaluated: "'quick'" }],
	returnType: 'any',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-first',
};

last.doc = {
	name: 'last',
	description: 'Returns the last element of the array',
	examples: [{ example: "['quick', 'brown', 'fox'].last()", evaluated: "'fox'" }],
	returnType: 'any',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-last',
};

max.doc = {
	name: 'max',
	description:
		'Returns the largest number in the array. Throws an error if there are any non-numbers.',
	examples: [{ example: '[1, 12, 5].max()', evaluated: '12' }],
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-max',
};

min.doc = {
	name: 'min',
	description:
		'Returns the smallest number in the array. Throws an error if there are any non-numbers.',
	examples: [{ example: '[12, 1, 5].min()', evaluated: '1' }],
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-min',
};

randomItem.doc = {
	name: 'randomItem',
	description: 'Returns a randomly-chosen element from the array',
	examples: [
		{ example: "['quick', 'brown', 'fox'].randomItem()", evaluated: "'brown'" },
		{ example: "['quick', 'brown', 'fox'].randomItem()", evaluated: "'quick'" },
	],
	returnType: 'any',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-randomItem',
};

sum.doc = {
	name: 'sum',
	description:
		'Returns the total of all the numbers in the array. Throws an error if there are any non-numbers.',
	examples: [{ example: '[12, 1, 5].sum()', evaluated: '18' }],
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-sum',
};

chunk.doc = {
	name: 'chunk',
	description: 'Splits the array into an array of sub-arrays, each with the given length',
	examples: [{ example: '[1, 2, 3, 4, 5, 6].chunk(2)', evaluated: '[[1,2],[3,4],[5,6]]' }],
	returnType: 'Array',
	args: [
		{
			name: 'length',
			optional: false,
			description: 'The number of elements in each chunk',
			type: 'number',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-chunk',
};

difference.doc = {
	name: 'difference',
	description:
		"Compares two arrays. Returns all elements in the base array that aren't present\nin <code>otherArray</code>.",
	examples: [{ example: '[1, 2, 3].difference([2, 3])', evaluated: '[1]' }],
	returnType: 'Array',
	args: [
		{
			name: 'otherArray',
			optional: false,
			description: 'The array to compare to the base array',
			type: 'Array',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-difference',
};

intersection.doc = {
	name: 'intersection',
	description:
		'Compares two arrays. Returns all elements in the base array that are also present in the other array.',
	examples: [{ example: '[1, 2].intersection([2, 3])', evaluated: '[2]' }],
	returnType: 'Array',
	args: [
		{
			name: 'otherArray',
			optional: false,
			description: 'The array to compare to the base array',
			type: 'Array',
		},
	],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-intersection',
};

merge.doc = {
	name: 'merge',
	description:
		'Merges two Object-arrays into one object by merging the key-value pairs of each element.',
	examples: [
		{
			example:
				"[{ name: 'Nathan' }, { age: 42 }].merge([{ city: 'Berlin' }, { country: 'Germany' }])",
			evaluated: "{ name: 'Nathan', age: 42, city: 'Berlin', country: 'Germany' }",
		},
	],
	returnType: 'Object',
	args: [
		{
			name: 'otherArray',
			optional: false,
			description: 'The array to merge into the base array',
			type: 'Array',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-merge',
};

pluck.doc = {
	name: 'pluck',
	description:
		'Returns an array containing the values of the given field(s) in each Object of the array. Ignores any array elements that aren’t Objects or don’t have a key matching the field name(s) provided.',
	examples: [
		{
			example: "[{ name: 'Nathan', age: 42 },{ name: 'Jan', city: 'Berlin' }].pluck('name')",
			evaluated: '["Nathan", "Jan"]',
		},
		{
			example: "[{ name: 'Nathan', age: 42 },{ name: 'Jan', city: 'Berlin' }].pluck('age')",
			evaluated: '[42]',
		},
	],
	returnType: 'Array',
	args: [
		{
			name: 'fieldNames',
			optional: false,
			variadic: true,
			description: 'The keys to retrieve the value of',
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-pluck',
};

renameKeys.doc = {
	name: 'renameKeys',
	description:
		'Changes all matching keys (field names) of any Objects in the array. Rename more than one key by\nadding extra arguments, i.e. <code>from1, to1, from2, to2, ...</code>.',
	examples: [
		{
			example: "[{ name: 'bob' }, { name: 'meg' }].renameKeys('name', 'x')",
			evaluated: "[{ x: 'bob' }, { x: 'meg' }]",
		},
	],
	returnType: 'Array',
	args: [
		{
			name: 'from',
			optional: false,
			description: 'The key to rename',
			type: 'string',
		},
		{ name: 'to', optional: false, description: 'The new key name', type: 'string' },
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-renameKeys',
};

smartJoin.doc = {
	name: 'smartJoin',
	description:
		'Creates a single Object from an array of Objects. Each Object in the array provides one field for the returned Object. Each Object in the array must contain a field with the key name and a field with the value.',
	examples: [
		{
			example:
				"[{ field: 'age', value: 2 }, { field: 'city', value: 'Berlin' }].smartJoin('field', 'value')",
			evaluated: "{ age: 2, city: 'Berlin' }",
		},
	],
	returnType: 'Object',
	args: [
		{
			name: 'keyField',
			optional: false,
			description: 'The field in each Object containing the key name',
			type: 'string',
		},
		{
			name: 'nameField',
			optional: false,
			description: 'The field in each Object containing the value',
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-smartJoin',
};

union.doc = {
	name: 'union',
	description: 'Concatenates two arrays and then removes any duplicates',
	examples: [{ example: '[1, 2].union([2, 3])', evaluated: '[1, 2, 3]' }],
	returnType: 'Array',
	args: [
		{
			name: 'otherArray',
			optional: false,
			description: 'The array to union with the base array',
			type: 'Array',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-union',
};

unique.doc = {
	name: 'unique',
	description: 'Removes any duplicate elements from the array',
	examples: [
		{ example: "['quick', 'brown', 'quick'].unique()", evaluated: "['quick', 'brown']" },
		{
			example: "[{ name: 'Nathan', age: 42 }, { name: 'Nathan', age: 22 }].unique()",
			evaluated: "[{ name: 'Nathan', age: 42 }, { name: 'Nathan', age: 22 }]",
		},
		{
			example: "[{ name: 'Nathan', age: 42 }, { name: 'Nathan', age: 22 }].unique('name')",
			evaluated: "[{ name: 'Nathan', age: 42 }]",
		},
	],
	returnType: 'any',
	aliases: ['removeDuplicates'],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-unique',
	args: [
		{
			name: 'fieldNames',
			optional: false,
			variadic: true,
			description: 'The object keys to check for equality',
			type: 'any',
		},
	],
};

toJsonString.doc = {
	name: 'toJsonString',
	description:
		"Converts the array to a JSON string. The same as JavaScript's <code>JSON.stringify()</code>.",
	examples: [
		{
			example: "['quick', 'brown', 'fox'].toJsonString()",
			evaluated: '\'["quick","brown","fox"]\'',
		},
	],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-toJsonString',
	returnType: 'string',
};

append.doc = {
	name: 'append',
	description:
		'Adds new elements to the end of the array. Similar to <code>push()</code>, but returns the modified array. Consider using spread syntax instead (see examples).',
	examples: [
		{ example: "['forget', 'me'].append('not')", evaluated: "['forget', 'me', 'not']" },
		{ example: '[9, 0, 2].append(1, 0)', evaluated: '[9, 0, 2, 1, 0]' },
		{
			example: '[...[9, 0, 2], 1, 0]',
			evaluated: '[9, 0, 2, 1, 0]',
			description: 'Consider using spread syntax instead',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/arrays/#array-append',
	returnType: 'Array',
	args: [
		{
			name: 'elements',
			optional: false,
			variadic: true,
			description: 'The elements to append, in order',
			type: 'any',
		},
	],
};

const removeDuplicates: Extension = unique.bind({});
removeDuplicates.doc = { ...unique.doc, hidden: true };

export const arrayExtensions: ExtensionMap = {
	typeName: 'Array',
	functions: {
		removeDuplicates,
		unique,
		first,
		last,
		pluck,
		randomItem,
		sum,
		min,
		max,
		average,
		isNotEmpty,
		isEmpty,
		compact,
		smartJoin,
		chunk,
		renameKeys,
		merge,
		union,
		difference,
		intersection,
		append,
		toJsonString,
		toInt,
		toFloat,
		toBoolean,
		toDateTime,
	},
};
