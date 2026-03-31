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
