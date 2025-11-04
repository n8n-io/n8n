import { ApplicationError } from '@n8n/errors';
import { parse as esprimaParse, Syntax } from 'esprima-next';
import type { Node as SyntaxNode, ExpressionStatement } from 'esprima-next';
import FormData from 'form-data';
import merge from 'lodash/merge';

import { ALPHABET } from './constants';
import { ManualExecutionCancelledError } from './errors/execution-cancelled.error';
import type { BinaryFileType, IDisplayOptions, INodeProperties, JsonObject } from './interfaces';
import * as LoggerProxy from './logger-proxy';

const readStreamClasses = new Set(['ReadStream', 'Readable', 'ReadableStream']);

// NOTE: BigInt.prototype.toJSON is not available, which causes JSON.stringify to throw an error
// as well as the flatted stringify method. This is a workaround for that.
BigInt.prototype.toJSON = function () {
	return this.toString();
};

export const isObjectEmpty = (obj: object | null | undefined): boolean => {
	if (obj === undefined || obj === null) return true;
	if (typeof obj === 'object') {
		if (obj instanceof FormData) return obj.getLengthSync() === 0;
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

function syntaxNodeToValue(expression?: SyntaxNode | null): unknown {
	switch (expression?.type) {
		case Syntax.ObjectExpression:
			return Object.fromEntries(
				expression.properties
					.filter((prop) => prop.type === Syntax.Property)
					.map(({ key, value }) => [syntaxNodeToValue(key), syntaxNodeToValue(value)]),
			);
		case Syntax.Identifier:
			return expression.name;
		case Syntax.Literal:
			return expression.value;
		case Syntax.ArrayExpression:
			return expression.elements.map((exp) => syntaxNodeToValue(exp));
		default:
			return undefined;
	}
}

/**
 * Parse any JavaScript ObjectExpression, including:
 * - single quoted keys
 * - unquoted keys
 */
function parseJSObject(objectAsString: string): object {
	const jsExpression = esprimaParse(`(${objectAsString})`).body.find(
		(node): node is ExpressionStatement =>
			node.type === Syntax.ExpressionStatement && node.expression.type === Syntax.ObjectExpression,
	);

	return syntaxNodeToValue(jsExpression?.expression) as object;
}

type MutuallyExclusive<T, U> =
	| (T & { [k in Exclude<keyof U, keyof T>]?: never })
	| (U & { [k in Exclude<keyof T, keyof U>]?: never });

type JSONParseOptions<T> = { acceptJSObject?: boolean } & MutuallyExclusive<
	{ errorMessage?: string },
	{ fallbackValue?: T }
>;

/**
 * Parses a JSON string into an object with optional error handling and recovery mechanisms.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @param {Object} [options] - Optional settings for parsing the JSON string. Either `fallbackValue` or `errorMessage` can be set, but not both.
 * @param {boolean} [options.acceptJSObject=false] - If true, attempts to recover from common JSON format errors by parsing the JSON string as a JavaScript Object.
 * @param {string} [options.errorMessage] - A custom error message to throw if the JSON string cannot be parsed.
 * @param {*} [options.fallbackValue] - A fallback value to return if the JSON string cannot be parsed.
 * @returns {Object} - The parsed object, or the fallback value if parsing fails and `fallbackValue` is set.
 */
export const jsonParse = <T>(jsonString: string, options?: JSONParseOptions<T>): T => {
	try {
		return JSON.parse(jsonString) as T;
	} catch (error) {
		if (options?.acceptJSObject) {
			try {
				const jsonStringCleaned = parseJSObject(jsonString);
				return jsonStringCleaned as T;
			} catch (e) {
				// Ignore this error and return the original error or the fallback value
			}
		}
		if (options?.fallbackValue !== undefined) {
			if (options.fallbackValue instanceof Function) {
				return options.fallbackValue();
			}
			return options.fallbackValue;
		} else if (options?.errorMessage) {
			throw new ApplicationError(options.errorMessage);
		}

		throw error;
	}
};

type JSONStringifyOptions = {
	replaceCircularRefs?: boolean;
};

/**
 * Decodes a Base64 string with proper UTF-8 character handling.
 *
 * @param str - The Base64 string to decode
 * @returns The decoded UTF-8 string
 */
export const base64DecodeUTF8 = (str: string): string => {
	try {
		// Use modern TextDecoder for proper UTF-8 handling
		const bytes = new Uint8Array(
			atob(str)
				.split('')
				.map((char) => char.charCodeAt(0)),
		);
		return new TextDecoder('utf-8').decode(bytes);
	} catch (error) {
		// Fallback method for older browsers
		console.warn('TextDecoder not available, using fallback method');
		return atob(str);
	}
};

export const replaceCircularReferences = <T>(value: T, knownObjects = new WeakSet()): T => {
	if (typeof value !== 'object' || value === null || value instanceof RegExp) return value;
	if ('toJSON' in value && typeof value.toJSON === 'function') return value.toJSON() as T;
	if (knownObjects.has(value)) return '[Circular Reference]' as T;
	knownObjects.add(value);
	const copy = (Array.isArray(value) ? [] : {}) as T;
	for (const key in value) {
		try {
			copy[key] = replaceCircularReferences(value[key], knownObjects);
		} catch (error: unknown) {
			if (
				error instanceof TypeError &&
				error.message.includes('Cannot assign to read only property')
			) {
				LoggerProxy.error('Error while replacing circular references: ' + error.message, { error });
				continue; // Skip properties that cannot be assigned to (readonly, non-configurable, etc.)
			}
			throw error;
		}
	}
	knownObjects.delete(value);
	return copy;
};

export const jsonStringify = (obj: unknown, options: JSONStringifyOptions = {}): string => {
	return JSON.stringify(options?.replaceCircularRefs ? replaceCircularReferences(obj) : obj);
};

export const sleep = async (ms: number): Promise<void> =>
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

export const sleepWithAbort = async (ms: number, abortSignal?: AbortSignal): Promise<void> =>
	await new Promise((resolve, reject) => {
		if (abortSignal?.aborted) {
			reject(new ManualExecutionCancelledError(''));
			return;
		}

		const timeout = setTimeout(resolve, ms);

		const abortHandler = () => {
			clearTimeout(timeout);
			reject(new ManualExecutionCancelledError(''));
		};

		abortSignal?.addEventListener('abort', abortHandler, { once: true });
	});

export function fileTypeFromMimeType(mimeType: string): BinaryFileType | undefined {
	if (mimeType.startsWith('application/json')) return 'json';
	if (mimeType.startsWith('text/html')) return 'html';
	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('audio/')) return 'audio';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType.startsWith('text/') || mimeType.startsWith('application/javascript')) return 'text';
	if (mimeType.startsWith('application/pdf')) return 'pdf';
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

export const isTraversableObject = (value: any): value is JsonObject => {
	return value && typeof value === 'object' && !Array.isArray(value) && !!Object.keys(value).length;
};

export const removeCircularRefs = (obj: JsonObject, seen = new Set()) => {
	seen.add(obj);
	Object.entries(obj).forEach(([key, value]) => {
		if (isTraversableObject(value)) {
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			seen.has(value) ? (obj[key] = { circularReference: true }) : removeCircularRefs(value, seen);
			return;
		}
		if (Array.isArray(value)) {
			value.forEach((val, index) => {
				if (seen.has(val)) {
					value[index] = { circularReference: true };
					return;
				}
				if (isTraversableObject(val)) {
					removeCircularRefs(val, seen);
				}
			});
		}
	});
};

export function updateDisplayOptions(
	displayOptions: IDisplayOptions,
	properties: INodeProperties[],
) {
	return properties.map((nodeProperty) => {
		return {
			...nodeProperty,
			displayOptions: merge({}, nodeProperty.displayOptions, displayOptions),
		};
	});
}

export function randomInt(max: number): number;
export function randomInt(min: number, max: number): number;
/**
 * Generates a random integer within a specified range.
 *
 * @param {number} min - The lower bound of the range. If `max` is not provided, this value is used as the upper bound and the lower bound is set to 0.
 * @param {number} [max] - The upper bound of the range, not inclusive.
 * @returns {number} A random integer within the specified range.
 */
export function randomInt(min: number, max?: number): number {
	if (max === undefined) {
		max = min;
		min = 0;
	}
	return min + (crypto.getRandomValues(new Uint32Array(1))[0] % (max - min));
}

export function randomString(length: number): string;
export function randomString(minLength: number, maxLength: number): string;
/**
 * Generates a random alphanumeric string of a specified length, or within a range of lengths.
 *
 * @param {number} minLength - If `maxLength` is not provided, this is the length of the string to generate. Otherwise, this is the lower bound of the range of possible lengths.
 * @param {number} [maxLength] - The upper bound of the range of possible lengths. If provided, the actual length of the string will be a random number between `minLength` and `maxLength`, inclusive.
 * @returns {string} A random alphanumeric string of the specified length or within the specified range of lengths.
 */
export function randomString(minLength: number, maxLength?: number): string {
	const length = maxLength === undefined ? minLength : randomInt(minLength, maxLength + 1);
	return [...crypto.getRandomValues(new Uint32Array(length))]
		.map((byte) => ALPHABET[byte % ALPHABET.length])
		.join('');
}

/**
 * Checks if a value is an object with a specific key and provides a type guard for the key.
 */
export function hasKey<T extends PropertyKey>(value: unknown, key: T): value is Record<T, unknown> {
	return value !== null && typeof value === 'object' && value.hasOwnProperty(key);
}

const unsafeObjectProperties = new Set(['__proto__', 'prototype', 'constructor', 'getPrototypeOf']);

/**
 * Checks if a property key is safe to use on an object, preventing prototype pollution.
 * setting untrusted properties can alter the object's prototype chain and introduce vulnerabilities.
 *
 * @see setSafeObjectProperty
 */
export function isSafeObjectProperty(property: string) {
	return !unsafeObjectProperties.has(property);
}

/**
 * Safely sets a property on an object, preventing prototype pollution.
 *
 * @see isSafeObjectProperty
 */
export function setSafeObjectProperty(
	target: Record<string, unknown>,
	property: string,
	value: unknown,
) {
	if (isSafeObjectProperty(property)) {
		target[property] = value;
	}
}

export function isDomainAllowed(
	urlString: string,
	options: {
		allowedDomains: string;
	},
): boolean {
	if (!options.allowedDomains || options.allowedDomains.trim() === '') {
		return true; // If no restrictions are set, allow all domains
	}

	try {
		const url = new URL(urlString);
		const hostname = url.hostname;

		const allowedDomainsList = options.allowedDomains
			.split(',')
			.map((domain) => domain.trim())
			.filter(Boolean);

		for (const allowedDomain of allowedDomainsList) {
			// Handle wildcard domains (*.example.com)
			if (allowedDomain.startsWith('*.')) {
				const domainSuffix = allowedDomain.substring(2); // Remove the *. part
				if (hostname.endsWith(domainSuffix)) {
					return true;
				}
			}
			// Exact match
			else if (hostname === allowedDomain) {
				return true;
			}
		}

		return false;
	} catch (error) {
		// If URL parsing fails, deny access to be safe
		return false;
	}
}

const COMMUNITY_PACKAGE_NAME_REGEX = /^(?!@n8n\/)(@[\w.-]+\/)?n8n-nodes-(?!base\b)\b\w+/g;

export function isCommunityPackageName(packageName: string): boolean {
	COMMUNITY_PACKAGE_NAME_REGEX.lastIndex = 0;
	// Community packages names start with <@username/>n8n-nodes- not followed by word 'base'
	const nameMatch = COMMUNITY_PACKAGE_NAME_REGEX.exec(packageName);

	return !!nameMatch;
}
