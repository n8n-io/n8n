import { describe, expect, it } from 'vitest';
import { formatValue, parseDotenv, setInDotenv, unsetInDotenv } from '../src/env/dotenv';

describe('parseDotenv', () => {
	it('should parse plain, quoted, and exported values', () => {
		const entries = parseDotenv(
			[
				'# comment',
				'A=1',
				'export B="two words"',
				"C='single # quoted'",
				'D=value # trailing comment',
				'E="line\\nbreak"',
				'# F=commented',
			].join('\n'),
		);

		expect(entries.map((e) => [e.key, e.value, e.line])).toEqual([
			['A', '1', 2],
			['B', 'two words', 3],
			['C', 'single # quoted', 4],
			['D', 'value', 5],
			['E', 'line\nbreak', 6],
		]);
	});

	it('should keep both lines when a key repeats, so the later one wins on merge', () => {
		const entries = parseDotenv('A=1\nA=2\n');
		expect(entries.map((e) => e.value)).toEqual(['1', '2']);
	});
});

describe('setInDotenv', () => {
	it('should update an active line in place and keep comments', () => {
		const text = '# header\nA=1\nB=2\n';
		expect(setInDotenv(text, 'A', '3')).toBe('# header\nA=3\nB=2\n');
	});

	it('should uncomment a commented line for the key', () => {
		const text = '# header\n# A=old\nB=2\n';
		expect(setInDotenv(text, 'A', 'new')).toBe('# header\nA=new\nB=2\n');
	});

	it('should append a new key before the trailing newline', () => {
		expect(setInDotenv('A=1\n', 'B', '2')).toBe('A=1\nB=2\n');
		expect(setInDotenv('', 'B', '2')).toBe('B=2\n');
	});

	it('should remove earlier active duplicates', () => {
		expect(setInDotenv('A=1\nA=2\n', 'A', '3')).toBe('A=3\n');
	});

	it('should quote values that need it', () => {
		expect(setInDotenv('', 'A', 'a b#c')).toBe('A="a b#c"\n');
	});
});

describe('unsetInDotenv', () => {
	it('should remove active lines and keep commented ones', () => {
		expect(unsetInDotenv('A=1\n# A=2\nB=3\n', 'A')).toEqual({ text: '# A=2\nB=3\n', removed: 1 });
	});
});

describe('formatValue', () => {
	it('should round-trip through the parser', () => {
		for (const value of [
			'plain',
			'with space',
			'quote"inside',
			'back\\slash',
			'multi\nline',
			'',
			'$HOME',
		]) {
			const [entry] = parseDotenv(`K=${formatValue(value)}`);
			expect(entry.value).toBe(value);
		}
	});
});
