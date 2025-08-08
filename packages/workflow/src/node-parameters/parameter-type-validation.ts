import { UserError } from '../errors';
import { assert } from '../utils';

export function assertUserInput<T>(condition: T, message?: string): asserts condition {
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

function assertIsType<T>(
	parameterName: string,
	value: unknown,
	type: 'string' | 'number' | 'boolean',
): asserts value is T {
	assertUserInput(typeof value === type, `Parameter "${parameterName}" is not ${type}`);
}

export function assertIsNumber(parameterName: string, value: unknown): asserts value is number {
	assertIsType<number>(parameterName, value, 'number');
}

export function assertIsString(parameterName: string, value: unknown): asserts value is string {
	assertIsType<string>(parameterName, value, 'string');
}

export function assertIsBoolean(parameterName: string, value: unknown): asserts value is boolean {
	assertIsType<string>(parameterName, value, 'boolean');
}

export function assertIsArray<T>(
	parameterName: string,
	value: unknown,
	validator: (val: unknown) => val is T,
): asserts value is T[] {
	assertUserInput(Array.isArray(value), `Parameter "${parameterName}" is not an array`);
	assertUserInput(
		value.every(validator),
		`Parameter "${parameterName}" has elements that don't match expected types`,
	);
}

type ParameterType =
	| 'string'
	| 'boolean'
	| 'number'
	| 'resource-locator'
	| 'string[]'
	| 'number[]'
	| 'boolean[]'
	| 'object';

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

function assertIsObjectType(parameterName: string, value: unknown): void {
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

function assertIsArrayType(parameterName: string, value: unknown, arrayType: string): void {
	const baseType = arrayType.slice(0, -2);
	const elementType =
		baseType === 'string' || baseType === 'number' || baseType === 'boolean' ? baseType : 'string';

	const validator = createElementValidator(elementType);
	assertIsArray(parameterName, value, validator);
}

function assertIsPrimitiveType(parameterName: string, value: unknown, type: string): void {
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
			assertIsObjectType(parameterName, value);
		} else if (type.endsWith('[]')) {
			assertIsArrayType(parameterName, value, type);
		} else {
			assertIsPrimitiveType(parameterName, value, type);
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

export function assertIsNodeParameters<T>(
	value: unknown,
	parameters: Record<
		string,
		{
			type: ParameterType | ParameterType[];
			optional?: boolean;
		}
	>,
): asserts value is T {
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
