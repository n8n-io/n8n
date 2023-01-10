import { ExpressionExtensionError } from '../ExpressionError';
import type { ExtensionMap } from './Extensions';

export function merge(value: object, extraArgs: unknown[]): unknown {
	const [other] = extraArgs;
	if (typeof other !== 'object' || !other) {
		throw new ExpressionExtensionError('argument of merge must be an object');
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newObject: any = { ...value };
	for (const [key, val] of Object.entries(other)) {
		if (!(key in newObject)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			newObject[key] = val;
		}
	}
	return newObject;
}

function isEmpty(value: object): boolean {
	return Object.keys(value).length === 0;
}

function hasField(value: object, extraArgs: string[]): boolean {
	const [name] = extraArgs;
	return name in value;
}

function removeField(value: object, extraArgs: string[]): object {
	const [name] = extraArgs;
	if (name in value) {
		const newObject = { ...value };
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
		delete (newObject as any)[name];
		return newObject;
	}
	return value;
}

function removeFieldsContaining(value: object, extraArgs: string[]): object {
	const [match] = extraArgs;
	if (typeof match !== 'string') {
		throw new ExpressionExtensionError('argument of removeFieldsContaining must be an string');
	}
	const newObject = { ...value };
	for (const [key, val] of Object.entries(value)) {
		if (typeof val === 'string' && val.includes(match)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
			delete (newObject as any)[key];
		}
	}
	return newObject;
}

function keepFieldsContaining(value: object, extraArgs: string[]): object {
	const [match] = extraArgs;
	if (typeof match !== 'string') {
		throw new ExpressionExtensionError('argument of keepFieldsContaining must be an string');
	}
	const newObject = { ...value };
	for (const [key, val] of Object.entries(value)) {
		if (typeof val === 'string' && !val.includes(match)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
			delete (newObject as any)[key];
		}
	}
	return newObject;
}

export function compact(value: object): object {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newObj: any = {};
	for (const [key, val] of Object.entries(value)) {
		if (val !== null && val !== undefined) {
			if (typeof val === 'object') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
				newObj[key] = compact(val);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				newObj[key] = val;
			}
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return newObj;
}

export function urlEncode(value: object) {
	return new URLSearchParams(value as Record<string, string>).toString();
}

export const objectExtensions: ExtensionMap = {
	typeName: 'Object',
	functions: {
		isEmpty,
		merge,
		hasField,
		removeField,
		removeFieldsContaining,
		keepFieldsContaining,
		compact,
		urlEncode,
	},
};
