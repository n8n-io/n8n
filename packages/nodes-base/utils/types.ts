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
	assert(typeof value === 'object' && value !== null, 'Value is not a valid object');

	const obj = value as Record<string, unknown>;

	Object.keys(parameters).forEach((key) => {
		const param = parameters[key];
		const paramValue = obj[key];

		if (!param.optional && paramValue === undefined) {
			assert(false, `Required parameter "${key}" is missing`);
		}

		if (paramValue !== undefined) {
			const types = Array.isArray(param.type) ? param.type : [param.type];
			let isValid = false;

			for (const type of types) {
				try {
					if (type === 'resource-locator') {
						assert(
							typeof paramValue === 'object' &&
								paramValue !== null &&
								'__rl' in paramValue &&
								'mode' in paramValue &&
								'value' in paramValue,
							`Parameter "${key}" is not a valid resource locator object`,
						);
					} else if (type === 'object') {
						assert(
							typeof paramValue === 'object' && paramValue !== null,
							`Parameter "${key}" is not a valid object`,
						);
					} else if (type.endsWith('[]')) {
						const baseType = type.slice(0, -2);
						const elementType =
							baseType === 'string' || baseType === 'number' || baseType === 'boolean'
								? baseType
								: 'string';
						assert(Array.isArray(paramValue), `Parameter "${key}" is not an array`);
						paramValue.forEach((item, index) => {
							assert(
								typeof item === elementType,
								`Parameter "${key}[${index}]" is not a valid ${elementType}`,
							);
						});
					} else {
						assert(typeof paramValue === type, `Parameter "${key}" is not a valid ${type}`);
					}
					isValid = true;
					break;
				} catch {
					// Continue to next type
				}
			}

			if (!isValid) {
				const typeList = types.join(' or ');
				assert(false, `Parameter "${key}" does not match any of the expected types: ${typeList}`);
			}
		}
	});
}
