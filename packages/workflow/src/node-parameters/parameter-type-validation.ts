import { NodeOperationError } from '../errors';
import type { INode } from '../interfaces';
import { assert } from '../utils';

type ParameterType =
	| 'string'
	| 'boolean'
	| 'number'
	| 'resource-locator'
	| 'string[]'
	| 'number[]'
	| 'boolean[]'
	| 'object';

function assertUserInput<T>(condition: T, message: string, node: INode): asserts condition {
	try {
		assert(condition, message);
	} catch (e: unknown) {
		if (e instanceof Error) {
			// Use level 'info' to prevent reporting to Sentry (only 'error' and 'fatal' levels are reported)
			const nodeError = new NodeOperationError(node, e.message, { level: 'info' });
			nodeError.stack = e.stack;
			throw nodeError;
		}

		throw e;
	}
}

function assertParamIsType<T>(
	parameterName: string,
	value: unknown,
	type: 'string' | 'number' | 'boolean',
	node: INode,
): asserts value is T {
	assertUserInput(typeof value === type, `Parameter "${parameterName}" is not ${type}`, node);
}

export function assertParamIsNumber(
	parameterName: string,
	value: unknown,
	node: INode,
): asserts value is number {
	assertParamIsType<number>(parameterName, value, 'number', node);
}

export function assertParamIsString(
	parameterName: string,
	value: unknown,
	node: INode,
): asserts value is string {
	assertParamIsType<string>(parameterName, value, 'string', node);
}

export function assertParamIsBoolean(
	parameterName: string,
	value: unknown,
	node: INode,
): asserts value is boolean {
	assertParamIsType<boolean>(parameterName, value, 'boolean', node);
}

type TypeofMap = {
	string: string;
	number: number;
	boolean: boolean;
};

export function assertParamIsOfAnyTypes<T extends ReadonlyArray<keyof TypeofMap>>(
	parameterName: string,
	value: unknown,
	types: T,
	node: INode,
): asserts value is TypeofMap[T[number]] {
	const isValid = types.some((type) => typeof value === type);
	if (!isValid) {
		const typeList = types.join(' or ');
		assertUserInput(false, `Parameter "${parameterName}" must be ${typeList}`, node);
	}
}

export function assertParamIsArray<T>(
	parameterName: string,
	value: unknown,
	validator: (val: unknown) => val is T,
	node: INode,
): asserts value is T[] {
	assertUserInput(Array.isArray(value), `Parameter "${parameterName}" is not an array`, node);

	// Use for loop instead of .every() to properly handle sparse arrays
	// .every() skips empty/sparse indices, which could allow invalid arrays to pass
	for (let i = 0; i < value.length; i++) {
		if (!validator(value[i])) {
			assertUserInput(
				false,
				`Parameter "${parameterName}" has elements that don't match expected types`,
				node,
			);
		}
	}
}

function assertIsValidObject(
	value: unknown,
	node: INode,
): asserts value is Record<string, unknown> {
	assertUserInput(typeof value === 'object' && value !== null, 'Value is not a valid object', node);
}

function assertIsRequiredParameter(
	parameterName: string,
	value: unknown,
	isRequired: boolean,
	node: INode,
): void {
	if (isRequired && value === undefined) {
		assertUserInput(false, `Required parameter "${parameterName}" is missing`, node);
	}
}

function assertIsResourceLocator(parameterName: string, value: unknown, node: INode): void {
	assertUserInput(
		typeof value === 'object' &&
			value !== null &&
			'__rl' in value &&
			'mode' in value &&
			'value' in value,
		`Parameter "${parameterName}" is not a valid resource locator object`,
		node,
	);
}

function assertParamIsObject(parameterName: string, value: unknown, node: INode): void {
	assertUserInput(
		typeof value === 'object' && value !== null,
		`Parameter "${parameterName}" is not a valid object`,
		node,
	);
}

function createElementValidator<T extends 'string' | 'number' | 'boolean'>(elementType: T) {
	return (
		val: unknown,
	): val is T extends 'string' ? string : T extends 'number' ? number : boolean =>
		typeof val === elementType;
}

function assertParamIsArrayOfType(
	parameterName: string,
	value: unknown,
	arrayType: string,
	node: INode,
): void {
	const baseType = arrayType.slice(0, -2);
	const elementType =
		baseType === 'string' || baseType === 'number' || baseType === 'boolean' ? baseType : 'string';

	const validator = createElementValidator(elementType);
	assertParamIsArray(parameterName, value, validator, node);
}

function assertParamIsPrimitive(
	parameterName: string,
	value: unknown,
	type: string,
	node: INode,
): void {
	assertUserInput(
		typeof value === type,
		`Parameter "${parameterName}" is not a valid ${type}`,
		node,
	);
}

function validateParameterType(
	parameterName: string,
	value: unknown,
	type: ParameterType,
	node: INode,
): boolean {
	try {
		if (type === 'resource-locator') {
			assertIsResourceLocator(parameterName, value, node);
		} else if (type === 'object') {
			assertParamIsObject(parameterName, value, node);
		} else if (type.endsWith('[]')) {
			assertParamIsArrayOfType(parameterName, value, type, node);
		} else {
			assertParamIsPrimitive(parameterName, value, type, node);
		}
		return true;
	} catch {
		return false;
	}
}

function validateParameterAgainstTypes(
	parameterName: string,
	value: unknown,
	types: ParameterType[],
	node: INode,
): void {
	let isValid = false;

	for (const type of types) {
		if (validateParameterType(parameterName, value, type, node)) {
			isValid = true;
			break;
		}
	}

	if (!isValid) {
		const typeList = types.join(' or ');
		assertUserInput(
			false,
			`Parameter "${parameterName}" does not match any of the expected types: ${typeList}`,
			node,
		);
	}
}

type InferParameterType<T extends ParameterType | ParameterType[]> = T extends ParameterType[]
	? InferSingleParameterType<T[number]>
	: T extends ParameterType
		? InferSingleParameterType<T>
		: never;

type InferSingleParameterType<T extends ParameterType> = T extends 'string'
	? string
	: T extends 'boolean'
		? boolean
		: T extends 'number'
			? number
			: T extends 'resource-locator'
				? Record<string, unknown>
				: T extends 'string[]'
					? string[]
					: T extends 'number[]'
						? number[]
						: T extends 'boolean[]'
							? boolean[]
							: T extends 'object'
								? Record<string, unknown>
								: unknown;

export function validateNodeParameters<
	T extends Record<string, { type: ParameterType | ParameterType[]; required?: boolean }>,
>(
	value: unknown,
	parameters: T,
	node: INode,
): asserts value is {
	[K in keyof T]: T[K]['required'] extends true
		? InferParameterType<T[K]['type']>
		: InferParameterType<T[K]['type']> | undefined;
} {
	assertIsValidObject(value, node);

	Object.keys(parameters).forEach((key) => {
		const param = parameters[key];
		const paramValue = value[key];

		assertIsRequiredParameter(key, paramValue, param.required ?? false, node);

		// If required, value cannot be undefined and must be validated
		// If not required, value can be undefined but should be validated when present
		if (param.required || paramValue !== undefined) {
			const types = Array.isArray(param.type) ? param.type : [param.type];
			validateParameterAgainstTypes(key, paramValue, types, node);
		}
	});
}
