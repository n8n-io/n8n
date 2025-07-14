import type { ExtensionMap } from './extensions';
import { ExpressionExtensionError } from '../errors/expression-extension.error';

function isEmpty(value: object): boolean {
	return Object.keys(value).length === 0;
}

function isNotEmpty(value: object): boolean {
	return !isEmpty(value);
}

function keys(value: object): string[] {
	return Object.keys(value);
}

function values(value: object): unknown[] {
	return Object.values(value);
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
	if (typeof match !== 'string' || match === '') {
		throw new ExpressionExtensionError('removeFieldsContaining(): expected non-empty string arg');
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
	if (typeof match !== 'string' || match === '') {
		throw new ExpressionExtensionError(
			'argument of keepFieldsContaining must be a non-empty string',
		);
	}
	const newObject = { ...value };
	for (const [key, val] of Object.entries(value)) {
		if (typeof val !== 'string' || (typeof val === 'string' && !val.includes(match))) {
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
		if (val !== null && val !== undefined && val !== 'nil' && val !== '') {
			if (typeof val === 'object') {
				if (Object.keys(val as object).length === 0) continue;
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
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

export function toJsonString(value: object) {
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

isEmpty.doc = {
	name: 'isEmpty',
	description:
		'Returns <code>true</code> if the Object has no keys (fields) set or is <code>null</code>',
	examples: [
		{ example: "({'name': 'Nathan'}).isEmpty()", evaluated: 'false' },
		{ example: '({}).isEmpty()', evaluated: 'true' },
	],
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-isEmpty',
};

isNotEmpty.doc = {
	name: 'isNotEmpty',
	description: 'Returns <code>true</code> if the Object has at least one key (field) set',
	examples: [
		{ example: "({'name': 'Nathan'}).isNotEmpty()", evaluated: 'true' },
		{ example: '({}).isNotEmpty()', evaluated: 'false' },
	],
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-isNotEmpty',
};

compact.doc = {
	name: 'compact',
	description:
		'Removes all fields that have empty values, i.e. are <code>null</code>, <code>undefined</code>, <code>"nil"</code> or <code>""</code>',
	examples: [{ example: "({ x: null, y: 2, z: '' }).compact()", evaluated: '{ y: 2 }' }],
	returnType: 'Object',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-compact',
};

urlEncode.doc = {
	name: 'urlEncode',
	description:
		"Generates a URL parameter string from the Object's keys and values. Only top-level keys are supported.",
	examples: [
		{
			example: "({ name: 'Mr Nathan', city: 'hanoi' }).urlEncode()",
			evaluated: "'name=Mr+Nathan&city=hanoi'",
		},
	],
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-urlEncode',
};

hasField.doc = {
	name: 'hasField',
	description:
		'Returns <code>true</code> if there is a field called <code>name</code>. Only checks top-level keys. Comparison is case-sensitive.',
	examples: [
		{ example: "({ name: 'Nathan', age: 42 }).hasField('name')", evaluated: 'true' },
		{ example: "({ name: 'Nathan', age: 42 }).hasField('Name')", evaluated: 'false' },
		{ example: "({ name: 'Nathan', age: 42 }).hasField('inventedField')", evaluated: 'false' },
	],
	returnType: 'boolean',
	args: [
		{
			name: 'name',
			optional: false,
			description: 'The name of the key to search for',
			type: 'string',
		},
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-hasField',
};

removeField.doc = {
	name: 'removeField',
	description: "Removes a field from the Object. The same as JavaScript's <code>delete</code>.",
	examples: [
		{
			example: "({ name: 'Nathan', city: 'hanoi' }).removeField('name')",
			evaluated: "{ city: 'hanoi' }",
		},
	],
	returnType: 'Object',
	args: [
		{
			name: 'key',
			optional: false,
			description: 'The name of the field to remove',
			type: 'string',
		},
	],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-removeField',
};

removeFieldsContaining.doc = {
	name: 'removeFieldsContaining',
	description:
		"Removes keys (fields) whose values at least partly match the given <code>value</code>. Comparison is case-sensitive. Fields that aren't strings are always kept.",
	examples: [
		{
			example: "({ name: 'Mr Nathan', city: 'hanoi', age: 42 }).removeFieldsContaining('Nathan')",
			evaluated: "{ city: 'hanoi', age: 42 }",
		},
		{
			example: "({ name: 'Mr Nathan', city: 'hanoi', age: 42 }).removeFieldsContaining('Han')",
			evaluated: '{ age: 42 }',
		},
		{
			example: "({ name: 'Mr Nathan', city: 'hanoi', age: 42 }).removeFieldsContaining('nathan')",
			evaluated: "{ name: 'Mr Nathan', city: 'hanoi', age: 42 }",
		},
	],
	returnType: 'Object',
	args: [
		{
			name: 'value',
			optional: false,
			description: 'The text that a value must contain in order to be removed',
			type: 'string',
		},
	],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-removeFieldsContaining',
};

keepFieldsContaining.doc = {
	name: 'keepFieldsContaining',
	description:
		"Removes any fields whose values don't at least partly match the given <code>value</code>. Comparison is case-sensitive. Fields that aren't strings will always be removed.",
	examples: [
		{
			example: "({ name: 'Mr Nathan', city: 'hanoi', age: 42 }).keepFieldsContaining('Nathan')",
			evaluated: "{ name: 'Mr Nathan' }",
		},
		{
			example: "({ name: 'Mr Nathan', city: 'hanoi', age: 42 }).keepFieldsContaining('nathan')",
			evaluated: '{}',
		},
		{
			example: "({ name: 'Mr Nathan', city: 'hanoi', age: 42 }).keepFieldsContaining('han')",
			evaluated: "{ name: 'Mr Nathan', city: 'hanoi' }",
		},
	],
	returnType: 'Object',
	args: [
		{
			name: 'value',
			optional: false,
			description: 'The text that a value must contain in order to be kept',
			type: 'string',
		},
	],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-keepFieldsContaining',
};

keys.doc = {
	name: 'keys',
	description:
		"Returns an array with all the field names (keys) the Object contains. The same as JavaScript's <code>Object.keys(obj)</code>.",
	examples: [{ example: "({ name: 'Mr Nathan', age: 42 }).keys()", evaluated: "['name', 'age']" }],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-keys',
	returnType: 'Array',
};

values.doc = {
	name: 'values',
	description:
		"Returns an array with all the values of the fields the Object contains. The same as JavaScript's <code>Object.values(obj)</code>.",
	examples: [
		{ example: "({ name: 'Mr Nathan', age: 42 }).values()", evaluated: "['Mr Nathan', 42]" },
	],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-values',
	returnType: 'Array',
};

toJsonString.doc = {
	name: 'toJsonString',
	description:
		"Converts the Object to a JSON string. Similar to JavaScript's <code>JSON.stringify()</code>.",
	examples: [
		{
			example: "({ name: 'Mr Nathan', age: 42 }).toJsonString()",
			evaluated: '\'{"name":"Nathan","age":42}\'',
		},
	],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/objects/#object-toJsonString',
	returnType: 'string',
};

export const objectExtensions: ExtensionMap = {
	typeName: 'Object',
	functions: {
		isEmpty,
		isNotEmpty,
		hasField,
		removeField,
		removeFieldsContaining,
		keepFieldsContaining,
		compact,
		urlEncode,
		keys,
		values,
		toJsonString,
		toInt,
		toFloat,
		toBoolean,
		toDateTime,
	},
};
