import type {
	AssignmentCollectionValue,
	INodeParameters,
	NodeParameterValue,
	NodeParameterValueType,
} from '../interfaces';
import { isResourceLocatorValue, isResourceMapperValue, isFilterValue } from '../type-guards';

/**
 * Type guard for primitive NodeParameterValue types.
 * Checks if a value is string, number, boolean, undefined, or null.
 */
export function isNodeParameterValue(value: unknown): value is NodeParameterValue {
	return (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		value === undefined ||
		value === null
	);
}

/**
 * Type guard for AssignmentCollectionValue.
 * Checks if a value has the structure of an assignment collection.
 */
export function isAssignmentCollectionValue(value: unknown): value is AssignmentCollectionValue {
	if (typeof value !== 'object' || value === null || !('assignments' in value)) {
		return false;
	}

	const assignments = (value as AssignmentCollectionValue).assignments;
	if (!Array.isArray(assignments)) {
		return false;
	}

	return assignments.every(
		(assignment) =>
			typeof assignment === 'object' &&
			assignment !== null &&
			'id' in assignment &&
			'name' in assignment &&
			'value' in assignment &&
			typeof assignment.id === 'string' &&
			typeof assignment.name === 'string' &&
			isNodeParameterValue(assignment.value),
	);
}

/**
 * Type guard for INodeParameters.
 * Recursively validates that all values in the object are valid NodeParameterValueType.
 */
export function isNodeParameters(value: unknown): value is INodeParameters {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	// Recursively validate all values
	return Object.values(value).every((val) => isValidNodeParameterValueType(val));
}

/**
 * Comprehensive type guard for NodeParameterValueType.
 * Validates that a value matches any of the valid node parameter value types.
 *
 * @param value - The value to check
 * @returns true if the value is a valid NodeParameterValueType
 *
 * @example
 * ```typescript
 * const value: unknown = { foo: 'bar' };
 * if (isValidNodeParameterValueType(value)) {
 *   // value is now typed as NodeParameterValueType
 * }
 * ```
 */
export function isValidNodeParameterValueType(value: unknown): value is NodeParameterValueType {
	// Check primitives first (most common case)
	if (isNodeParameterValue(value)) {
		return true;
	}

	// Check special object types
	if (isResourceLocatorValue(value)) {
		return true;
	}

	if (isResourceMapperValue(value)) {
		return true;
	}

	if (isFilterValue(value)) {
		return true;
	}

	if (isAssignmentCollectionValue(value)) {
		return true;
	}

	// Check arrays
	if (Array.isArray(value)) {
		// Empty arrays are valid
		if (value.length === 0) {
			return true;
		}

		// Check if it's an array of primitives
		if (value.every(isNodeParameterValue)) {
			return true;
		}

		// Check if it's an array of INodeParameters
		if (value.every(isNodeParameters)) {
			return true;
		}

		// Check if it's an array of resource locators
		if (value.every(isResourceLocatorValue)) {
			return true;
		}

		// Check if it's an array of resource mapper values
		if (value.every(isResourceMapperValue)) {
			return true;
		}

		return false;
	}

	// Check if it's INodeParameters (must be last to avoid infinite recursion on first check)
	if (isNodeParameters(value)) {
		return true;
	}

	return false;
}

/**
 * Assertion function that throws if the value is not a valid NodeParameterValueType.
 * Useful for runtime validation with TypeScript type narrowing.
 *
 * @param value - The value to validate
 * @param errorMessage - Optional custom error message
 * @throws Error if the value is not a valid NodeParameterValueType
 *
 * @example
 * ```typescript
 * const value: unknown = getData();
 * assertIsValidNodeParameterValueType(value);
 * // value is now typed as NodeParameterValueType
 * ```
 */
export function assertIsValidNodeParameterValueType(
	value: unknown,
	errorMessage = 'Value is not a valid NodeParameterValueType',
): asserts value is NodeParameterValueType {
	if (!isValidNodeParameterValueType(value)) {
		throw new Error(errorMessage);
	}
}
