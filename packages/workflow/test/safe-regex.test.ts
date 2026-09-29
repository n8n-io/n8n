import { describe, expect, it } from 'vitest';

import {
	parseRegexLiteral,
	resetInternalRegexEngine,
	resetUserRegexEngine,
	safeInternalRegex,
	safeUserRegex,
	setInternalRegexEngine,
	setUserRegexEngine,
} from '../src';

describe('safeInternalRegex', () => {
	afterEach(() => {
		resetInternalRegexEngine();
	});

	it('parses slash-delimited regex literals', () => {
		expect(parseRegexLiteral('/foo/gi')).toEqual({ source: 'foo', flags: 'gi' });
		expect(parseRegexLiteral('foo')).toEqual({ source: 'foo', flags: '' });
	});

	it('delegates operations to the configured engine', () => {
		setInternalRegexEngine({
			exec: vi.fn(() => ['match'] as unknown as RegExpExecArray),
			test: vi.fn(() => true),
			replace: vi.fn(() => 'replaced'),
			matchAll: vi.fn(() => [['match'] as unknown as RegExpMatchArray]),
			split: vi.fn(() => ['a', 'b']),
		});

		expect(safeInternalRegex.exec('source', 'input')).toEqual(['match']);
		expect(safeInternalRegex.test('source', 'input')).toBe(true);
		expect(safeInternalRegex.replace('source', 'input', 'g', 'replacement')).toBe('replaced');
		expect(safeInternalRegex.matchAll('source', 'input')).toEqual([['match']]);
		expect(safeInternalRegex.split('source', 'input')).toEqual(['a', 'b']);
	});

	it('throws when a regex test times out', () => {
		expect(() => safeInternalRegex.test('(a+)+$', `${'a'.repeat(30)}b`)).toThrow(
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

	it('leaves safeInternalRegex on its own engine', () => {
		setUserRegexEngine(engine);

		// The two entry points are independent: n8n's own patterns must stay on the
		// built-in engine whatever the instance selects for a user's patterns.
		expect(safeInternalRegex.test('^a$', 'a')).toBe(true);
		expect(safeInternalRegex.test('^a$', 'b')).toBe(false);
	});

	it('defaults to the same engine as safeInternalRegex', () => {
		expect(safeUserRegex.test('^a$', 'a')).toBe(true);
		expect(() => safeUserRegex.test('(a+)+$', `${'a'.repeat(30)}b`)).toThrow(
			'Regular expression execution timed out',
		);
	});
});
