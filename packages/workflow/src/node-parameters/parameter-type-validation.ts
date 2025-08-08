import { UserError } from '../errors';
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

function assertUserInput<T>(condition: T, message?: string): asserts condition {
	try {
		assert(condition, message);
	} catch (e: unknown) {
		if (e instanceof Error) {
			const userError = new UserError(e.message, {
				shouldReport: false,
			});
			userError.stack = e.stack;
			throw userError;
		}

		throw e;
	}
}

function assertParamIsType<T>(
	parameterName: string,
	value: unknown,
	type: 'string' | 'number' | 'boolean',
): asserts value is T {
	assertUserInput(typeof value === type, `Parameter "${parameterName}" is not ${type}`);
}

export function assertParamIsNumber(
	parameterName: string,
	value: unknown,
): asserts value is number {
	assertParamIsType<number>(parameterName, value, 'number');
}

export function assertParamIsString(
	parameterName: string,
	value: unknown,
): asserts value is string {
	assertParamIsType<string>(parameterName, value, 'string');
}

export function assertParamIsBoolean(
	parameterName: string,
	value: unknown,
): asserts value is boolean {
	assertParamIsType<boolean>(parameterName, value, 'boolean');
}

export function assertParamIsArray<T>(
	parameterName: string,
	value: unknown,
	validator: (val: unknown) => val is T,
): asserts value is T[] {
	assertUserInput(Array.isArray(value), `Parameter "${parameterName}" is not an array`);

	// Use for loop instead of .every() to properly handle sparse arrays
	// .every() skips empty/sparse indices, which could allow invalid arrays to pass
	for (let i = 0; i < value.length; i++) {
		if (!validator(value[i])) {
			assertUserInput(
				false,
				`Parameter "${parameterName}" has elements that don't match expected types`,
			);
		}
	}
}

function assertIsValidObject(value: unknown): asserts value is Record<string, unknown> {
	assertUserInput(typeof value === 'object' && value !== null, 'Value is not a valid object');
}

function assertIsRequiredParameter(
	parameterName: string,
	value: unknown,
	isOptional: boolean,
): void {
	if (!isOptional && value === undefined) {
		assertUserInput(false, `Required parameter "${parameterName}" is missing`);
	}
}

function assertIsResourceLocator(parameterName: string, value: unknown): void {
	assertUserInput(
		typeof value === 'object' &&
			value !== null &&
			'__rl' in value &&
			'mode' in value &&
			'value' in value,
		`Parameter "${parameterName}" is not a valid resource locator object`,
	);
}

function assertParamIsObject(parameterName: string, value: unknown): void {
	assertUserInput(
		typeof value === 'object' && value !== null,
		`Parameter "${parameterName}" is not a valid object`,
	);
}

function createElementValidator<T extends 'string' | 'number' | 'boolean'>(elementType: T) {
	return (
		val: unknown,
	): val is T extends 'string' ? string : T extends 'number' ? number : boolean =>
		typeof val === elementType;
}

function assertParamIsArrayOfType(parameterName: string, value: unknown, arrayType: string): void {
	const baseType = arrayType.slice(0, -2);
	const elementType =
		baseType === 'string' || baseType === 'number' || baseType === 'boolean' ? baseType : 'string';

	const validator = createElementValidator(elementType);
	assertParamIsArray(parameterName, value, validator);
}

function assertParamIsPrimitive(parameterName: string, value: unknown, type: string): void {
	assertUserInput(typeof value === type, `Parameter "${parameterName}" is not a valid ${type}`);
}

function validateParameterType(
	parameterName: string,
	value: unknown,
	type: ParameterType,
): boolean {
	try {
		if (type === 'resource-locator') {
			assertIsResourceLocator(parameterName, value);
		} else if (type === 'object') {
			assertParamIsObject(parameterName, value);
		} else if (type.endsWith('[]')) {
			assertParamIsArrayOfType(parameterName, value, type);
		} else {
			assertParamIsPrimitive(parameterName, value, type);
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
): void {
	let isValid = false;

	for (const type of types) {
		if (validateParameterType(parameterName, value, type)) {
			isValid = true;
			break;
		}
	}

	if (!isValid) {
		const typeList = types.join(' or ');
		assertUserInput(
			false,
			`Parameter "${parameterName}" does not match any of the expected types: ${typeList}`,
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
	T extends Record<string, { type: ParameterType | ParameterType[]; optional?: boolean }>,
>(
	value: unknown,
	parameters: T,
): asserts value is {
	[K in keyof T]: T[K]['optional'] extends true
		? InferParameterType<T[K]['type']> | undefined
		: InferParameterType<T[K]['type']>;
} {
	assertIsValidObject(value);

	Object.keys(parameters).forEach((key) => {
		const param = parameters[key];
		const paramValue = value[key];

		assertIsRequiredParameter(key, paramValue, param.optional ?? false);

		if (paramValue !== undefined) {
			const types = Array.isArray(param.type) ? param.type : [param.type];
			validateParameterAgainstTypes(key, paramValue, types);
		}
	});
}
