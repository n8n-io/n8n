import { describe, expect, it } from 'vitest';

import { parseRegexLiteral, resetSafeRegexEngine, safeRegex, setSafeRegexEngine } from '../src';

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
