import { ExpressionError, ExpressionExtensionError } from './ExpressionError';
import type { BinaryFileType } from './Interfaces';

const readStreamClasses = new Set(['ReadStream', 'Readable', 'ReadableStream']);

export const isObjectEmpty = (obj: object | null | undefined): boolean => {
	if (obj === undefined || obj === null) return true;
	if (typeof obj === 'object') {
		if (Array.isArray(obj)) return obj.length === 0;
		if (obj instanceof Set || obj instanceof Map) return obj.size === 0;
		if (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer) return obj.byteLength === 0;
		if (Symbol.iterator in obj || readStreamClasses.has(obj.constructor.name)) return false;
		return Object.keys(obj).length === 0;
	}
	return true;
};

export type Primitives = string | number | boolean | bigint | symbol | null | undefined;

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
export const deepCopy = <T extends ((object | Date) & { toJSON?: () => string }) | Primitives>(
	source: T,
	hash = new WeakMap(),
	path = '',
): T => {
	const hasOwnProp = Object.prototype.hasOwnProperty.bind(source);
	// Primitives & Null & Function
	if (typeof source !== 'object' || source === null || typeof source === 'function') {
		return source;
	}
	// Date and other objects with toJSON method
	// TODO: remove this when other code parts not expecting objects with `.toJSON` method called and add back checking for Date and cloning it properly
	if (typeof source.toJSON === 'function') {
		return source.toJSON() as T;
	}
	if (hash.has(source)) {
		return hash.get(source);
	}
	// Array
	if (Array.isArray(source)) {
		const clone = [];
		const len = source.length;
		for (let i = 0; i < len; i++) {
			clone[i] = deepCopy(source[i], hash, path + `[${i}]`);
		}
		return clone as T;
	}
	// Object
	const clone = Object.create(Object.getPrototypeOf({}));
	hash.set(source, clone);
	for (const i in source) {
		if (hasOwnProp(i)) {
			clone[i] = deepCopy((source as any)[i], hash, path + `.${i}`);
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

type JSONStringifyOptions = {
	replaceCircularRefs?: boolean;
};

const replaceCircularReferences = <T>(value: T, knownObjects = new WeakSet()): T => {
	if (typeof value !== 'object' || value === null || value instanceof RegExp) return value;
	if ('toJSON' in value && typeof value.toJSON === 'function') return value.toJSON() as T;
	if (knownObjects.has(value)) return '[Circular Reference]' as T;
	knownObjects.add(value);
	const copy = (Array.isArray(value) ? [] : {}) as T;
	for (const key in value) {
		copy[key] = replaceCircularReferences(value[key], knownObjects);
	}
	knownObjects.delete(value);
	return copy;
};

export const jsonStringify = (obj: unknown, options: JSONStringifyOptions = {}): string => {
	return JSON.stringify(options?.replaceCircularRefs ? replaceCircularReferences(obj) : obj);
};

export const sleep = async (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

export function fileTypeFromMimeType(mimeType: string): BinaryFileType | undefined {
	if (mimeType.startsWith('application/json')) return 'json';
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType.startsWith('text/')) return 'text';
	return;
}

export function assert<T>(condition: T, msg?: string): asserts condition {
	if (!condition) {
		const error = new Error(msg ?? 'Invalid assertion');
		// hide assert stack frame if supported
		if (Error.hasOwnProperty('captureStackTrace')) {
			// V8 only - https://nodejs.org/api/errors.html#errors_error_capturestacktrace_targetobject_constructoropt
			Error.captureStackTrace(error, assert);
		} else if (error.stack) {
			// fallback for IE and Firefox
			error.stack = error.stack
				.split('\n')
				.slice(1) // skip assert function from stack frames
				.join('\n');
		}
		throw error;
	}
}

const IS_FRONTEND_IN_DEV_MODE =
	typeof process === 'object' &&
	Object.keys(process).length === 1 &&
	'env' in process &&
	Object.keys(process.env).length === 0;

export const IS_FRONTEND = typeof process === 'undefined' || IS_FRONTEND_IN_DEV_MODE;

export const isSyntaxError = (error: unknown): error is SyntaxError =>
	error instanceof SyntaxError || (error instanceof Error && error.name === 'SyntaxError');

export const isExpressionError = (error: unknown): error is ExpressionError =>
	error instanceof ExpressionError || error instanceof ExpressionExtensionError;

export const isTypeError = (error: unknown): error is TypeError =>
	error instanceof TypeError || (error instanceof Error && error.name === 'TypeError');
