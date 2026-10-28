import { DateTime } from 'luxon';
import type { IExecuteFunctions } from 'n8n-workflow';

import {
	evaluateSqlQueryParameterSegments,
	isInsideQuotes,
	resolveQueryReplacementSegments,
	resolveSqlQueryParameters,
	splitRawSqlQueryParameters,
} from './sql-query-parameters';

describe('isInsideQuotes', () => {
	test.each([
		{
			label: 'a position inside a single-quoted string',
			text: "WHERE note = 'hello' AND id = 1",
			target: 'hello',
			expected: true,
		},
		{
			label: 'a position after a closed single-quoted string',
			text: "WHERE note = 'hello' AND id = 1",
			target: 'id',
			expected: false,
		},
		{
			label: 'a stray double quote inside a single-quoted string does not close it',
			text: "WHERE note = 'a\"b' AND id = $2",
			target: '$2',
			expected: false,
		},
		{
			label: 'an escaped single quote (doubled) does not end the string early',
			text: "WHERE note = 'it''s $2 here'",
			target: '$2',
			expected: true,
		},
	])('$label', ({ text, target, expected }) => {
		expect(isInsideQuotes(text, text.indexOf(target))).toBe(expected);
	});
});

describe('splitRawSqlQueryParameters', () => {
	test.each([
		{
			label: 'plain comma-separated literal',
			input: '5, Alice',
			expected: ['5', 'Alice'],
		},
		{
			label: 'expression-mode prefix is stripped',
			input: '={{ $json.a }},member',
			expected: ['{{ $json.a }}', 'member'],
		},
		{
			label: 'a comma inside an expression body is not a delimiter',
			input: "={{ $json.a + ',' + 'x' }},member",
			expected: ["{{ $json.a + ',' + 'x' }}", 'member'],
		},
		{
			label: 'a single segment with no commas',
			input: '={{ $json.a }}',
			expected: ['{{ $json.a }}'],
		},
		{
			label: 'an empty leading segment keeps its position',
			input: ',foo',
			expected: ['', 'foo'],
		},
		{
			label: 'an empty trailing segment keeps its position',
			input: 'foo,',
			expected: ['foo', ''],
		},
		{
			label: 'a field that is empty outright yields no values',
			input: '=',
			expected: [],
		},
	])('$label', ({ input, expected }) => {
		expect(splitRawSqlQueryParameters(input)).toEqual(expected);
	});
});

describe('evaluateSqlQueryParameterSegments', () => {
	const now = DateTime.fromISO('2026-10-16T12:08:30.187+01:00');
	const nativeDate = new Date('2026-01-01T00:00:00.000Z');
	const context = {
		getNode: vi.fn().mockReturnValue({ parameters: {} }),
		evaluateExpression: vi.fn((expr: string) => {
			if (expr === '{{ $json.a }}') return 'A';
			if (expr === '{{ $json.b }}') return 'B';
			if (expr === '{{ $json.list }}') return ['x', 'y'];
			if (expr === '{{ $json.missing }}') return undefined;
			if (expr === '{{ $now }}') return now;
			if (expr === '{{ new Date() }}') return nativeDate;
			throw new Error(`unhandled expression: ${expr}`);
		}),
	} as unknown as IExecuteFunctions;

	test.each([
		{
			label: 'a plain literal segment',
			segments: ['member'],
			expected: ['member'],
		},
		{
			label: 'a segment that is exactly one expression keeps its own type',
			segments: ['{{ $json.list }}'],
			expected: [['x', 'y']],
		},
		{
			label: 'literal text around an expression renders as one string',
			segments: ['prefix-{{ $json.a }}-suffix'],
			expected: ['prefix-A-suffix'],
		},
		{
			label: 'more than one expression in a segment renders as one string',
			segments: ['{{ $json.a }}{{ $json.b }}'],
			expected: ['AB'],
		},
		{
			label: 'a missing field next to literal text renders as empty text, not the word undefined',
			segments: ['{{ $json.missing }} member'],
			expected: [' member'],
		},
		{
			label: 'a date is a string wherever it shares the field with other segments',
			segments: ['{{ $now }}', 'member'],
			expected: [now.toString(), 'member'],
		},
	])('$label', ({ segments, expected }) => {
		expect(evaluateSqlQueryParameterSegments.call(context, segments, 0)).toEqual(expected);
	});

	test('a lone date segment is still a string, like getNodeParameter would return', () => {
		expect(evaluateSqlQueryParameterSegments.call(context, ['{{ $now }}'], 0)).toEqual([
			now.toString(),
		]);
	});

	test('a collection value cannot share the field with another value', () => {
		expect(() =>
			evaluateSqlQueryParameterSegments.call(context, ['{{ $json.list }}', 'member'], 0),
		).toThrow(/collection|array|object/i);
	});

	test('a native Date is not a collection, even sharing the field with another value', () => {
		expect(
			evaluateSqlQueryParameterSegments.call(context, ['{{ new Date() }}', 'member'], 0),
		).toEqual([nativeDate, 'member']);
	});

	test('a missing field as its own segment binds as null, not undefined', () => {
		// Some drivers (e.g. Snowflake's SDK) only special-case an explicit null,
		// so a bare missing-field segment must normalize to null, not undefined.
		expect(
			evaluateSqlQueryParameterSegments.call(context, ['{{ $json.missing }}', 'member'], 0),
		).toEqual([null, 'member']);
	});
});

describe('resolveQueryReplacementSegments', () => {
	const buildContext = (queryReplacement: string) =>
		({
			getNode: vi.fn().mockReturnValue({ parameters: { options: { queryReplacement } } }),
			evaluateExpression: vi.fn((expr: string) => {
				if (expr === '{{ $json.a }}') return 'A';
				throw new Error(`unhandled expression: ${expr}`);
			}),
		}) as unknown as IExecuteFunctions;

	test('an expression-mode field evaluates its resolvables', () => {
		const context = buildContext('={{ $json.a }},member');
		expect(resolveQueryReplacementSegments.call(context, 0, 'A,member')).toEqual(['A', 'member']);
	});

	test('a fixed-mode field is split literally and never evaluated', () => {
		const context = buildContext('a,{{ $json.a }}');
		expect(resolveQueryReplacementSegments.call(context, 0, 'a,{{ $json.a }}')).toEqual([
			'a',
			'{{ $json.a }}',
		]);
	});
});

describe('resolveSqlQueryParameters', () => {
	const now = DateTime.fromISO('2026-10-16T12:08:30.187+01:00');

	const buildContext = (queryReplacement: string, evaluated: unknown) =>
		({
			getNode: vi.fn().mockReturnValue({ parameters: { options: { queryReplacement } } }),
			getNodeParameter: vi.fn().mockReturnValue(evaluated),
			evaluateExpression: vi.fn().mockReturnValue(evaluated),
		}) as unknown as IExecuteFunctions;

	test('a lone date value is bound as a string, not the Luxon object', () => {
		const context = buildContext('={{ $now }}', now);
		expect(resolveSqlQueryParameters.call(context, 0)).toEqual([now.toString()]);
	});

	test('a field that evaluates to an array is used as the list of values itself', () => {
		const context = buildContext('={{ $json.ids }}', ['a', 'b']);
		expect(resolveSqlQueryParameters.call(context, 0)).toEqual(['a', 'b']);
	});
});
