import { ExpressionError, ExpressionExtensionError } from '../ExpressionError';
import type { ExtensionMap } from './Extensions';
import { compact as oCompact } from './ObjectExtensions';
import deepEqual from 'deep-equal';

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
				extraArgs.forEach((field: string) => {
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
	if (extraArgs.length) {
		return value.reduce<unknown[]>((l, v) => {
			if (typeof v === 'object' && v !== null && extraArgs.every((i) => i in v)) {
				const alreadySeen = l.find((i) =>
					extraArgs.every((j) =>
						deepEqual(
							(i as Record<string, unknown>)[j],
							(v as Record<string, unknown>, { strict: true })[j],
							{ strict: true },
						),
					),
				);
				if (!alreadySeen) {
					l.push(v);
				}
			}
			return l;
		}, []);
	}
	return value.reduce<unknown[]>((l, v) => {
		if (l.findIndex((i) => deepEqual(i, v, { strict: true })) === -1) {
			l.push(v);
		}
		return l;
	}, []);
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
		// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		if (value.findIndex((w) => deepEqual(w, v, { strict: true })) !== -1) {
			newArr.push(v);
		}
	}
	return unique(newArr, []);
}

average.doc = {
	name: 'average',
	description: 'Returns the mean average of all values in the array',
	returnType: 'number',
};

compact.doc = {
	name: 'compact',
	description: 'Removes all empty values from the array',
	returnType: 'array',
};

isEmpty.doc = {
	name: 'isEmpty',
	description: 'Checks if the array doesn’t have any elements',
	returnType: 'boolean',
};

isNotEmpty.doc = {
	name: 'isNotEmpty',
	description: 'Checks if the array has elements',
	returnType: 'boolean',
};

first.doc = {
	name: 'first',
	description: 'Returns the first element of the array',
	returnType: 'array item',
};

last.doc = {
	name: 'last',
	description: 'Returns the last element of the array',
	returnType: 'array item',
};

max.doc = {
	name: 'max',
	description: 'Gets the maximum value from a number-only array',
	returnType: 'number',
};

min.doc = {
	name: 'min',
	description: 'Gets the minimum value from a number-only array',
	returnType: 'number',
};

randomItem.doc = {
	name: 'randomItem',
	description: 'Returns a random element from an array',
	returnType: 'number',
};

sum.doc = {
	name: 'sum',
	description: 'Returns the total sum all the values in an array of parsable numbers',
	returnType: 'number',
};

// @TODO_NEXT_PHASE: Surface extensions below which take args

chunk.doc = {
	name: 'chunk',
	returnType: 'array',
};

difference.doc = {
	name: 'difference',
	returnType: 'array',
};

intersection.doc = {
	name: 'intersection',
	returnType: 'array',
};

merge.doc = {
	name: 'merge',
	returnType: 'array',
};

pluck.doc = {
	name: 'pluck',
	returnType: 'array',
};

renameKeys.doc = {
	name: 'renameKeys',
	returnType: 'array',
};

smartJoin.doc = {
	name: 'smartJoin',
	returnType: 'array',
};

union.doc = {
	name: 'union',
	returnType: 'array',
};

unique.doc = {
	name: 'unique',
	returnType: 'array item',
	aliases: ['removeDuplicates'],
};

export const arrayExtensions: ExtensionMap = {
	typeName: 'Array',
	functions: {
		removeDuplicates: unique,
		first,
		last,
		pluck,
		unique,
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
	},
};
