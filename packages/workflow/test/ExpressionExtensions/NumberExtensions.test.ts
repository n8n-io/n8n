/**
 * @jest-environment jsdom
 */

import { numberExtensions } from '@/Extensions/NumberExtensions';
import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Number Data Transformation Functions', () => {
		test('.random() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).random() }}')).not.toBeUndefined();
		});

		test('.isBlank() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).isBlank() }}')).toEqual(false);
		});

		test('.isPresent() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).isPresent() }}')).toEqual(
				numberExtensions.functions.isPresent(100),
			);
		});

		test('.format() should work correctly on a number', () => {
			expect(evaluate('={{ Number(100).format() }}')).toEqual(
				numberExtensions.functions.format(100, []),
			);
		});
	});

	describe('Multiple expressions', () => {
		test('Basic multiple expressions', () => {
			expect(evaluate('={{ "Test".sayHi() }} you have ${{ (100).format() }}.')).toEqual(
				'hi Test you have $100.',
			);
		});
	});
});
