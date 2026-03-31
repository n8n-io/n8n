import type { IDataObject } from 'n8n-workflow';

/**
 * Converts various boolean-like values (0/1, '0'/'1', true/false) to strict boolean.
 */
export function coerceToBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (value === 1 || value === '1') return true;
	if (value === 0 || value === '0') return false;
	if (typeof value === 'string') {
		if (value.toLowerCase() === 'true') return true;
		if (value.toLowerCase() === 'false') return false;
	}
	return Boolean(value);
}

/**
 * Converts string numbers to number type, throws on NaN.
 */
export function coerceToNumber(value: unknown): number {
	if (typeof value === 'number') return value;
	const num = Number(value);
	if (isNaN(num)) {
		throw new Error(`Cannot convert "${String(value)}" to a number`);
	}
	return num;
}

/**
 * Converts 'YYYY-MM-DD HH:mm:ss' format to RFC 3339 format (with 'T' separator).
 * Passes through values that already contain 'T'.
 */
export function toRfc3339(value: string): string {
	if (value.includes('T')) return value;
	return value.replace(' ', 'T');
}

/**
 * Applies coerceToBoolean to specified fields in a body object.
 */
export function applyV2TypeStrictness(body: IDataObject, booleanFields: string[]): void {
	for (const field of booleanFields) {
		if (body[field] !== undefined) {
			body[field] = coerceToBoolean(body[field]);
		}
	}
}
