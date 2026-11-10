import { tryToParseTime } from '../src/type-validation';

describe('tryToParseTime value ranges', () => {
	it('should reject out-of-range hours', () => {
		expect(() => tryToParseTime('24:00')).toThrow();
		expect(() => tryToParseTime('99:00')).toThrow();
	});

	it('should reject out-of-range minutes and seconds', () => {
		expect(() => tryToParseTime('12:60')).toThrow();
		expect(() => tryToParseTime('12:30:99')).toThrow();
		expect(() => tryToParseTime('99:99')).toThrow();
	});

	it('should accept valid boundary times unchanged', () => {
		expect(tryToParseTime('00:00')).toBe('00:00');
		expect(tryToParseTime('23:59:59')).toBe('23:59:59');
		expect(tryToParseTime('12:30+05:30')).toBe('12:30+05:30');
	});

	it('should still reject malformed input', () => {
		expect(() => tryToParseTime('1:30')).toThrow();
		expect(() => tryToParseTime('12:30 trailing')).toThrow();
	});
});
