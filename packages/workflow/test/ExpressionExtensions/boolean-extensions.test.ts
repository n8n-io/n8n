// @vitest-environment jsdom

import { evaluate } from './helpers';
import { booleanExtensions } from '../../src/extensions/boolean-extensions';

describe('Data Transformation Functions', () => {
	describe('Boolean Data Transformation Functions', () => {
		describe('Conversion methods', () => {
			describe('toInt/toFloat', () => {
				test('should return 1 for true, 0 for false', () => {
					expect(evaluate('={{ (true).toInt() }}')).toEqual(1);
					expect(evaluate('={{ (true).toFloat() }}')).toEqual(1);
					expect(evaluate('={{ (false).toInt() }}')).toEqual(0);
					expect(evaluate('={{ (false).toFloat() }}')).toEqual(0);
				});
			});

			describe('toDateTime', () => {
				test('should return undefined', () => {
					expect(evaluate('={{ (true).toDateTime() }}')).toBeUndefined();
				});
			});

			describe('toBoolean', () => {
				test('should return itself', () => {
					expect(evaluate('={{ (true).toDateTime() }}')).toBeUndefined();
				});
			});

			test('should not have a doc (hidden from autocomplete)', () => {
				expect(booleanExtensions.functions.toFloat.doc).toBeUndefined();
				expect(booleanExtensions.functions.toBoolean.doc).toBeUndefined();
				expect(booleanExtensions.functions.toDateTime.doc).toBeUndefined();
			});
		});
	});
});
