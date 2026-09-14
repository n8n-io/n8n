import { describe, expect, it } from 'vitest';

import {
	parseRegexLiteral,
	resetInternalRegexEngine,
	safeInternalRegex,
	setInternalRegexEngine,
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
