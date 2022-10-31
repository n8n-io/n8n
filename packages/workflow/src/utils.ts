/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
export const deepCopy = <T>(source: T, hash = new WeakMap(), path = ''): T => {
	let clone: any;
	let i: any;
	const hasOwnProp = Object.prototype.hasOwnProperty.bind(source);
	// Primitives & Null & Function
	if (typeof source !== 'object' || source === null || source instanceof Function) {
		return source;
	}
	if (hash.has(source)) {
		return hash.get(source);
	}
	// Date
	if (source instanceof Date) {
		return new Date(source.getTime()) as T;
	}
	// Array
	if (Array.isArray(source)) {
		clone = [];
		const len = source.length;
		for (i = 0; i < len; i++) {
			clone[i] = deepCopy(source[i], hash, path + `[${i as string}]`);
		}
		return clone;
	}
	// Object
	clone = {};
	hash.set(source, clone);
	for (i in source) {
		if (hasOwnProp(i)) {
			clone[i] = deepCopy((source as any)[i], hash, path + `.${i as string}`);
		}
	}
	return clone;
};
// eslint-enable

type MutuallyExclusive<T, U> =
	| (T & { [k in Exclude<keyof U, keyof T>]?: never })
	| (U & { [k in Exclude<keyof T, keyof U>]?: never });

type JSONParseOptions<T> = MutuallyExclusive<{ errorMessage: string }, { fallbackValue: T }>;

export const jsonParse = <T>(jsonString: string, options?: JSONParseOptions<T>): T => {
	try {
		return JSON.parse(jsonString) as T;
	} catch (error) {
		if (options?.fallbackValue !== undefined) {
			return options.fallbackValue;
		} else if (options?.errorMessage) {
			throw new Error(options.errorMessage);
		}

		throw error;
	}
};
