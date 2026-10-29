import type { INode } from 'n8n-workflow';
import { NodeOperationError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	assertNoQueryDelimiters,
	escapeBackslashQuotedValue,
	escapeCognitoFilterValue,
	escapeODataSearchValue,
	escapeODataValue,
	escapeSgqlLikeValue,
	toODataDateTimeLiteral,
} from '../query-escaping';

const ctx = { getNode: () => mock<INode>({ name: 'Test Node' }) };

describe('escapeODataValue', () => {
	it.each([
		['', ''],
		['plain', 'plain'],
		["O'Brien", "O''Brien"],
		["a'b'c", "a''b''c"],
		["''", "''''"],
		['back\\slash', 'back\\slash'],
		['double " quote', 'double " quote'],
	])('escapes %j as %j', (input, expected) => {
		expect(escapeODataValue(input)).toBe(expected);
	});

	it('keeps every quote inside its literal', () => {
		const value = escapeODataValue("a'b'c");

		expect(`displayName eq '${value}'`).toBe("displayName eq 'a''b''c'");
	});
});

describe('escapeBackslashQuotedValue', () => {
	it.each([
		['', ''],
		['plain', 'plain'],
		["O'Brien", "O\\'Brien"],
		["a'b'c", "a\\'b\\'c"],
		['back\\slash', 'back\\\\slash'],
	])('escapes %j as %j', (input, expected) => {
		expect(escapeBackslashQuotedValue(input)).toBe(expected);
	});

	it('escapes backslashes before quotes, so a trailing backslash cannot consume the escape', () => {
		expect(escapeBackslashQuotedValue('trailing\\')).toBe('trailing\\\\');
		expect(escapeBackslashQuotedValue("trailing\\'")).toBe("trailing\\\\\\'");
	});

	it('keeps every quote inside its literal', () => {
		const value = escapeBackslashQuotedValue("a'b'c");

		expect(`email LIKE '${value}'`).toBe("email LIKE 'a\\'b\\'c'");
	});
});

describe('escapeSgqlLikeValue', () => {
	it.each([
		['plain@example.com', 'plain@example.com'],
		["o'brien@example.com", "o\\'brien@example.com"],
		['%', '%%'],
		['a%b', 'a%%b'],
		['under_score@example.com', 'under_score@example.com'],
	])('escapes %j as %j', (input, expected) => {
		expect(escapeSgqlLikeValue(input)).toBe(expected);
	});

	it('keeps a wildcard from widening the operand', () => {
		expect(`email LIKE '${escapeSgqlLikeValue('%')}'`).toBe("email LIKE '%%'");
	});
});

describe('escapeCognitoFilterValue', () => {
	it.each([
		['plain', 'plain'],
		['say "hi"', 'say \\"hi\\"'],
		['back\\slash', 'back\\\\slash'],
	])('escapes %j as %j', (input, expected) => {
		expect(escapeCognitoFilterValue(input)).toBe(expected);
	});
});

describe('coerces a non-string value', () => {
	it.each([
		[5, '5'],
		[true, 'true'],
		[null, 'null'],
	])('accepts %j', (input, expected) => {
		expect(escapeODataValue(input)).toBe(expected);
		expect(escapeBackslashQuotedValue(input)).toBe(expected);
		expect(escapeODataSearchValue(input)).toBe(expected);
	});

	it('does not throw for a non-string in assertNoQueryDelimiters', () => {
		expect(() => assertNoQueryDelimiters.call(ctx, 'Username', 5, ['^'])).not.toThrow();
	});
});

describe('escapeODataSearchValue', () => {
	it.each([
		['', ''],
		['plain', 'plain'],
		['say "hi"', 'say \\"hi\\"'],
		['back\\slash', 'back\\\\slash'],
		['trailing\\', 'trailing\\\\'],
		['x\\"', 'x\\\\\\"'],
		["O'Brien", "O'Brien"],
	])('escapes %j as %j', (input, expected) => {
		expect(escapeODataSearchValue(input)).toBe(expected);
	});

	it('keeps every quote inside its phrase', () => {
		const value = escapeODataSearchValue('a"b"c');

		expect(`"displayName:${value}"`).toBe('"displayName:a\\"b\\"c"');
	});
});

describe('toODataDateTimeLiteral', () => {
	it.each([
		'2024-01-31T09:00:00Z',
		'2024-01-31T09:00:00.000Z',
		'2024-01-31T09:00:00+02:00',
		'2024-01-31T09:00:00-05:30',
	])('passes %j through unchanged', (value) => {
		expect(toODataDateTimeLiteral('Received After', value)).toBe(value);
	});

	it.each([
		['2024-01-31', '2024-01-31T00:00:00Z'],
		['2024-01-31T09:00', '2024-01-31T09:00:00Z'],
		['2024-01-31T09:00:00', '2024-01-31T09:00:00Z'],
	])('completes %j to %j', (value, expected) => {
		expect(toODataDateTimeLiteral('Received After', value)).toBe(expected);
	});

	it('keeps the wall clock when it completes a value', () => {
		// Re-parsing would resolve this against the local zone and could move it
		// into another day.
		expect(toODataDateTimeLiteral('Received After', '2024-01-31T00:30')).toBe(
			'2024-01-31T00:30:00Z',
		);
	});

	it.each([
		[1706691600000, '2024-01-31T09:00:00.000Z'],
		['1706691600000', '2024-01-31T09:00:00.000Z'],
	])('converts %j milliseconds since the epoch to %j', (value, expected) => {
		expect(toODataDateTimeLiteral('Received After', value)).toBe(expected);
	});

	it.each([
		["2024-01-31T09:00:00Z or contains(subject,'x')"],
		['2024-01-31 or isRead eq false'],
		['2024-01-31T09:00:00Z,'],
		["2024-01-31T09:00:00Z'"],
		['(2024-01-31)'],
		['not a date'],
		[''],
		['1e21'],
		[Number.MAX_VALUE],
		[true],
		[null],
	])('rejects %j', (value) => {
		expect(() => toODataDateTimeLiteral('Received After', value)).toThrow(UserError);
	});

	it('names the field in the error', () => {
		expect(() => toODataDateTimeLiteral('Received Before', 'nope')).toThrow(
			"'Received Before' must be a date",
		);
	});
});

describe('assertNoQueryDelimiters', () => {
	it('accepts a value without any of the delimiters', () => {
		expect(() =>
			assertNoQueryDelimiters.call(ctx, 'Username', 'jane.doe@n8n.io', ['^']),
		).not.toThrow();
	});

	it('accepts an empty value', () => {
		expect(() => assertNoQueryDelimiters.call(ctx, 'Username', '', ['^'])).not.toThrow();
	});

	it.each([['^'], ["'"], ['"']])('rejects a value containing %j', (delimiter) => {
		expect(() =>
			assertNoQueryDelimiters.call(ctx, 'Username', `a${delimiter}b`, ['^', "'", '"']),
		).toThrow(NodeOperationError);
	});

	it('names the field and the delimiter in the error', () => {
		expect(() => assertNoQueryDelimiters.call(ctx, 'Username', 'a^b', ['^'])).toThrow(
			"'Username' cannot contain ^",
		);
	});
});
