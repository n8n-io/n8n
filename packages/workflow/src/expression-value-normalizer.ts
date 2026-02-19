import type { IDataObject } from './interfaces';

/**
 * Normalizes expression input values by converting Date objects to ISO strings.
 *
 * This ensures consistent behavior between editor execution (where data is often
 * serialized as strings) and full workflow execution (where Date objects from
 * nodes like DataTable are preserved).
 *
 * Only normalizes values exposed to expressions - does not modify stored execution data.
 * Recursively processes objects and arrays to handle nested Date objects.
 *
 * @param value - The value to normalize (can be any type)
 * @returns Normalized value with Date objects converted to ISO strings
 */
export function normalizeExpressionValue(value: unknown): unknown {
	// Handle null/undefined
	if (value === null || value === undefined) {
		return value;
	}

	// Convert Date objects to ISO strings
	if (value instanceof Date) {
		return value.toISOString();
	}

	// Handle arrays recursively
	if (Array.isArray(value)) {
		return value.map(normalizeExpressionValue);
	}

	// Handle objects recursively
	if (typeof value === 'object') {
		const normalized: IDataObject = {};
		for (const [key, val] of Object.entries(value)) {
			normalized[key] = normalizeExpressionValue(val) as IDataObject[string];
		}
		return normalized;
	}

	// Return primitives as-is
	return value;
}
