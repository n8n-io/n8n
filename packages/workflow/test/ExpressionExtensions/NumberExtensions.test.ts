/**
 * @jest-environment jsdom
 */

import { numberExtensions } from '@/Extensions/NumberExtensions';
import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Number Data Transformation Functions', () => {
		test('.format() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).format() }}')).toEqual(
				numberExtensions.functions.format(100, []),
			);
		});

		test('.ceil() should work on a number', () => {
			expect(evaluate('={{ (1.2).ceil() }}')).toEqual(2);
			expect(evaluate('={{ (1.9).ceil() }}')).toEqual(2);
			expect(evaluate('={{ (1.0).ceil() }}')).toEqual(1);
			expect(evaluate('={{ (NaN).ceil() }}')).toBeNaN();
		});

		test('.floor() should work on a number', () => {
			expect(evaluate('={{ (1.2).floor() }}')).toEqual(1);
			expect(evaluate('={{ (1.9).floor() }}')).toEqual(1);
			expect(evaluate('={{ (1.0).floor() }}')).toEqual(1);
			expect(evaluate('={{ (NaN).floor() }}')).toBeNaN();
		});

		test('.round() should work on a number', () => {
			expect(evaluate('={{ (1.3333333).round(3) }}')).toEqual(1.333);
			expect(evaluate('={{ (1.3333333).round(0) }}')).toEqual(1);
			expect(evaluate('={{ (1.5001).round(0) }}')).toEqual(2);
			expect(evaluate('={{ (NaN).round(3) }}')).toBeNaN();
		});

		test('.isOdd() should work on a number', () => {
			expect(evaluate('={{ (9).isOdd() }}')).toEqual(true);
			expect(evaluate('={{ (8).isOdd() }}')).toEqual(false);
			expect(evaluate('={{ (0).isOdd() }}')).toEqual(false);
		});

		test('.isOdd() should not work on a float or NaN', () => {
			expect(() => evaluate('={{ (NaN).isOdd() }}')).toThrow();
			expect(() => evaluate('={{ (9.2).isOdd() }}')).toThrow();
		});

		test('.isEven() should work on a number', () => {
			expect(evaluate('={{ (9).isEven() }}')).toEqual(false);
			expect(evaluate('={{ (8).isEven() }}')).toEqual(true);
			expect(evaluate('={{ (0).isEven() }}')).toEqual(true);
		});

		test('.isEven() should not work on a float or NaN', () => {
			expect(() => evaluate('={{ (NaN).isEven() }}')).toThrow();
			expect(() => evaluate('={{ (9.2).isEven() }}')).toThrow();
		});

		describe('toDateTime', () => {
			test('from milliseconds (default)', () => {
				expect(evaluate('={{ (1704085200000).toDateTime().toISO() }}')).toEqual(
					'2024-01-01T00:00:00.000-05:00',
				);
				expect(evaluate('={{ (1704085200000).toDateTime("ms").toISO() }}')).toEqual(
					'2024-01-01T00:00:00.000-05:00',
				);
			});

			test('from seconds', () => {
				expect(evaluate('={{ (1704085200).toDateTime("s").toISO() }}')).toEqual(
					'2024-01-01T00:00:00.000-05:00',
				);
			});

			test('from Excel 1900 format', () => {
				expect(evaluate('={{ (42144).toDateTime("excel").toISO() }}')).toEqual(
					'2015-05-19T20:00:00.000-04:00',
				);
			});

			test('from microseconds', () => {
				expect(evaluate('={{ (1704085200000000).toDateTime("us").toISO() }}')).toEqual(
					'2024-01-01T00:00:00.000-05:00',
				);
			});
		});

		describe('toInt', () => {
			test('should round numbers', () => {
				expect(evaluate('={{ (42144).toInt() }}')).toEqual(42144);
				expect(evaluate('={{ (42144.345).toInt() }}')).toEqual(42144);
				expect(evaluate('={{ (42144.545).toInt() }}')).toEqual(42145);
			});
		});

		describe('toFloat', () => {
			test('should return itself', () => {
				expect(evaluate('={{ (42144).toFloat() }}')).toEqual(42144);
				expect(evaluate('={{ (42144.345).toFloat() }}')).toEqual(42144.345);
			});
		});

		describe('toBoolean', () => {
			test('should return false for 0, 1 for other numbers', () => {
				expect(evaluate('={{ (42144).toBoolean() }}')).toBe(true);
				expect(evaluate('={{ (-1.549).toBoolean() }}')).toBe(true);
				expect(evaluate('={{ (0).toBoolean() }}')).toBe(false);
			});
		});
	});

	describe('Multiple expressions', () => {
		test('Basic multiple expressions', () => {
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			expect(evaluate('={{ "test abc".toSnakeCase() }} you have ${{ (100).format() }}.')).toEqual(
				'test_abc you have $100.',
			);
		});
	});
});
