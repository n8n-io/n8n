/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
export const deepCopy = <T>(source: T): T => {
	let clone: any;
	let i: any;
	const hasOwnProp = Object.prototype.hasOwnProperty.bind(source);
	// Primitives & Null
	if (typeof source !== 'object' || source === null) {
		return source;
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
			clone[i] = deepCopy(source[i]);
		}
		return clone;
	}
	// Object
	clone = {};
	for (i in source) {
		if (hasOwnProp(i)) {
			clone[i] = deepCopy((source as any)[i]);
		}
	}
	return clone;
};
// eslint-enable
type ErrorMessage = { errorMessage: string };
type FallbackValue<T> = { fallbackValue: T };

export const jsonParse = <T>(
	jsonString: string,
	options: ErrorMessage | FallbackValue<T> | {} = {},
): T => {
	try {
		return JSON.parse(jsonString) as T;
	} catch (error) {
		if ('fallbackValue' in options) {
			return options.fallbackValue;
		}
		if ('errorMessage' in options) {
			throw new Error(options.errorMessage);
		}
		throw error;
	}
};
