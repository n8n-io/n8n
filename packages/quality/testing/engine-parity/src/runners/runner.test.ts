import { describe, expect, it } from 'vitest';

import { parseCaseTimeout } from './runner';

describe('parseCaseTimeout', () => {
	it('uses the default when the value is not set', () => {
		expect(parseCaseTimeout(undefined)).toBe(10_000);
		expect(parseCaseTimeout('')).toBe(10_000);
	});

	it('accepts a positive whole number of milliseconds', () => {
		expect(parseCaseTimeout('2500')).toBe(2500);
	});

	it.each(['0', '-1', 'abc', '1.5', String(2 ** 31)])('rejects "%s"', (value) => {
		expect(() => parseCaseTimeout(value)).toThrow('PARITY_CASE_TIMEOUT_MS');
	});
});
