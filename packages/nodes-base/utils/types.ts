import { assert } from 'n8n-workflow';

function assertIsType<T>(
	parameterName: string,
	value: unknown,
	type: 'string' | 'number' | 'boolean',
): asserts value is T {
	assert(typeof value === type, `Parameter "${parameterName}" is not ${type}`);
}

export function assertIsNumber(parameterName: string, value: unknown): asserts value is number {
	assertIsType<number>(parameterName, value, 'number');
}

export function assertIsString(parameterName: string, value: unknown): asserts value is string {
	assertIsType<string>(parameterName, value, 'string');
}

export function assertIsArray<T>(
	parameterName: string,
	value: unknown,
	validator: (val: unknown) => val is T,
): asserts value is T[] {
	assert(Array.isArray(value), `Parameter "${parameterName}" is not an array`);
	assert(
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
	assert(typeof value === 'object' && value !== null, 'Value is not a valid object');
}

function assertIsRequiredParameter(
	parameterName: string,
	value: unknown,
	isOptional: boolean,
): void {
	if (!isOptional && value === undefined) {
		assert(false, `Required parameter "${parameterName}" is missing`);
	}
}

function assertIsResourceLocator(parameterName: string, value: unknown): void {
	assert(
		typeof value === 'object' &&
			value !== null &&
			'__rl' in value &&
			'mode' in value &&
			'value' in value,
		`Parameter "${parameterName}" is not a valid resource locator object`,
	);
}

function assertIsObjectType(parameterName: string, value: unknown): void {
	assert(
		typeof value === 'object' && value !== null,
		`Parameter "${parameterName}" is not a valid object`,
	);
}

function createElementValidator(elementType: 'string' | 'number' | 'boolean') {
	return (val: unknown): val is string | number | boolean => typeof val === elementType;
}

function assertIsArrayType(parameterName: string, value: unknown, arrayType: string): void {
	const baseType = arrayType.slice(0, -2);
	const elementType =
		baseType === 'string' || baseType === 'number' || baseType === 'boolean' ? baseType : 'string';

	const validator = createElementValidator(elementType as 'string' | 'number' | 'boolean');
	assertIsArray(parameterName, value, validator);
}

function assertIsPrimitiveType(parameterName: string, value: unknown, type: string): void {
	assert(typeof value === type, `Parameter "${parameterName}" is not a valid ${type}`);
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
		assert(
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
