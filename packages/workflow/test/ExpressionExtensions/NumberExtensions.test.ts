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
