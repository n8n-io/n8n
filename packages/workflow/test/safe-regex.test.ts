import { describe, expect, it } from 'vitest';

import {
	parseRegexLiteral,
	resetSafeRegexEngine,
	resetUserRegexEngine,
	safeRegex,
	safeUserRegex,
	setSafeRegexEngine,
	setUserRegexEngine,
} from '../src';

describe('safeRegex', () => {
	afterEach(() => {
		resetSafeRegexEngine();
	});

	it('parses slash-delimited regex literals', () => {
		expect(parseRegexLiteral('/foo/gi')).toEqual({ source: 'foo', flags: 'gi' });
		expect(parseRegexLiteral('foo')).toEqual({ source: 'foo', flags: '' });
	});

	it('delegates operations to the configured engine', () => {
		setSafeRegexEngine({
			exec: vi.fn(() => ['match'] as unknown as RegExpExecArray),
			test: vi.fn(() => true),
			replace: vi.fn(() => 'replaced'),
			matchAll: vi.fn(() => [['match'] as unknown as RegExpMatchArray]),
			split: vi.fn(() => ['a', 'b']),
		});

		expect(safeRegex.exec('source', 'input')).toEqual(['match']);
		expect(safeRegex.test('source', 'input')).toBe(true);
		expect(safeRegex.replace('source', 'input', 'g', 'replacement')).toBe('replaced');
		expect(safeRegex.matchAll('source', 'input')).toEqual([['match']]);
		expect(safeRegex.split('source', 'input')).toEqual(['a', 'b']);
	});

	it('throws when a regex test times out', () => {
		expect(() => safeRegex.test('(a+)+$', `${'a'.repeat(30)}b`)).toThrow(
			'Regular expression execution timed out',
		);
	});
});

describe('safeUserRegex', () => {
	afterEach(() => {
		resetUserRegexEngine();
	});

	const engine = {
		exec: vi.fn(() => Object.assign(['match'], { 0: 'match' })),
		test: vi.fn(() => true),
		replace: vi.fn(() => 'replaced'),
		matchAll: vi.fn(() => [Object.assign(['match'], { 0: 'match' })]),
		split: vi.fn(() => ['a', 'b']),
	};

	it('delegates operations to the configured user engine', () => {
		setUserRegexEngine(engine);

		expect(safeUserRegex.exec('source', 'input')).toEqual(['match']);
		expect(safeUserRegex.test('source', 'input')).toBe(true);
		expect(safeUserRegex.replace('source', 'input', 'g', 'replacement')).toBe('replaced');
		expect(safeUserRegex.matchAll('source', 'input')).toEqual([['match']]);
		expect(safeUserRegex.split('source', 'input')).toEqual(['a', 'b']);
	});

	it('leaves safeRegex on its own engine', () => {
		setUserRegexEngine(engine);

		// The two entry points are independent: n8n's own patterns must keep the JS
		// dialect whatever the instance selects for a user's patterns.
		expect(safeRegex.test('^a$', 'a')).toBe(true);
		expect(safeRegex.test('^a$', 'b')).toBe(false);
	});

	it('defaults to the same engine as safeRegex', () => {
		expect(safeUserRegex.test('^a$', 'a')).toBe(true);
		expect(() => safeUserRegex.test('(a+)+$', `${'a'.repeat(30)}b`)).toThrow(
			'Regular expression execution timed out',
		);
	});
});
