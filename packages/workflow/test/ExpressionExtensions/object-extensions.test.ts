import { evaluate } from './helpers';
import { ApplicationError } from '../../src/errors';
import { objectExtensions } from '../../src/extensions/object-extensions';

describe('Data Transformation Functions', () => {
	describe('Object Data Transformation Functions', () => {
		describe('.isEmpty', () => {
			test('should return true for an empty object', () => {
				expect(evaluate('={{ ({}).isEmpty() }}')).toBe(true);
			});

			test('should return false for a non-empty object', () => {
				expect(evaluate('={{ ({ test: 1 }).isEmpty() }}')).toBe(false);
			});

			test('should return true for an object with only null/undefined values', () => {
				expect(evaluate('={{ ({ test1: null, test2: undefined }).isEmpty() }}')).toBe(false);
			});
		});

		describe('.hasField', () => {
			test('should return true if the key exists in the object', () => {
				expect(evaluate('={{ ({ test1: 1 }).hasField("test1") }}')).toBe(true);
			});

			test('should return false if the key does not exist in the object', () => {
				expect(evaluate('={{ ({ test1: 1 }).hasField("test2") }}')).toBe(false);
			});
		});

		test('.removeField should work on an object', () => {
			expect(evaluate('={{ ({ test1: 1, test2: 2, test3: 3 }).removeField("test2") }}')).toEqual({
				test1: 1,
				test3: 3,
			});
			expect(
				evaluate('={{ ({ test1: 1, test2: 2, test3: 3 }).removeField("testDoesntExist") }}'),
			).toEqual({
				test1: 1,
				test2: 2,
				test3: 3,
			});
		});

		describe('.removeFieldsContaining', () => {
			test('should work on an object', () => {
				expect(
					evaluate(
						'={{ ({ test1: "i exist", test2: "i should be removed", test3: "i should also be removed" }).removeFieldsContaining("removed") }}',
					),
				).toEqual({
					test1: 'i exist',
				});
			});

			test('should not work for empty string', () => {
				expect(() =>
					evaluate(
						'={{ ({ test1: "i exist", test2: "i should be removed", test3: "i should also be removed" }).removeFieldsContaining("") }}',
					),
				).toThrow();
			});
		});

		describe('.keepFieldsContaining', () => {
			test('.keepFieldsContaining should work on an object', () => {
				expect(
					evaluate(
						'={{ ({ test1: "i exist", test2: "i should be removed", test3: "i should also be removed" }).keepFieldsContaining("exist") }}',
					),
				).toEqual({
					test1: 'i exist',
				});
			});

			test('.keepFieldsContaining should work on a nested object', () => {
				expect(
					evaluate(
						'={{ ({ test1: "i exist", test2: "i should be removed", test3: { test4: "me too" } }).keepFieldsContaining("exist") }}',
					),
				).toEqual({
					test1: 'i exist',
				});
			});

			test('.keepFieldsContaining should not work for empty string', () => {
				expect(() =>
					evaluate(
						'={{ ({ test1: "i exist", test2: "i should be removed", test3: "i should also be removed" }).keepFieldsContaining("") }}',
					),
				).toThrow();
			});
		});

		describe('.compact', () => {
			test('should work on an object', () => {
				expect(
					evaluate('={{ ({ test1: 1, test2: "2", test3: undefined, test4: null }).compact() }}'),
				).toEqual({ test1: 1, test2: '2' });
			});

			test('should remove fields with null, undefined, empty string, or "nil"', () => {
				expect(
					evaluate(
						'={{ ({ test1: 0, test2: false, test3: "", test4: "nil", test5: NaN }).compact() }}',
					),
				).toEqual({ test1: 0, test2: false, test5: NaN });
			});

			test('should work on an empty object', () => {
				expect(evaluate('={{ ({}).compact() }}')).toEqual({});
			});

			test('should work on an object with all null/undefined values', () => {
				expect(evaluate('={{ ({ test1: undefined, test2: null }).compact() }}')).toEqual({});
			});

			test('should work on an object with nested null/undefined values', () => {
				expect(
					evaluate(
						'={{ ({ test1: 1, test2: { nested1: null, nested2: "value" }, test3: undefined }).compact() }}',
					),
				).toEqual({ test1: 1, test2: { nested2: 'value' } });
			});

			test('should not allow prototype pollution', () => {
				['{__proto__: {polluted: true}}', '{constructor: {prototype: {polluted: true}}}'].forEach(
					(testExpression) => {
						expect(() => evaluate(`={{ (${testExpression}).compact() }}`)).toThrow(
							ApplicationError,
						);
						expect(({} as any).polluted).toBeUndefined();
					},
				);
			});
		});

		test('.urlEncode should work on an object', () => {
			expect(evaluate('={{ ({ test1: 1, test2: "2" }).urlEncode() }}')).toEqual('test1=1&test2=2');
		});

		describe('.keys', () => {
			test('should return an array of keys from the object', () => {
				expect(evaluate('={{ ({ test1: 1, test2: 2 }).keys() }}')).toEqual(['test1', 'test2']);
			});

			test('should return an empty array for an empty object', () => {
				expect(evaluate('={{ ({}).keys() }}')).toEqual([]);
			});
		});

		describe('.values', () => {
			test('should return an array of values from the object', () => {
				expect(evaluate('={{ ({ test1: 1, test2: "value" }).values() }}')).toEqual([1, 'value']);
			});

			test('should return an empty array for an empty object', () => {
				expect(evaluate('={{ ({}).values() }}')).toEqual([]);
			});
		});

		test('.toJsonString() should work on an object', () => {
			expect(evaluate('={{ ({ test1: 1, test2: "2" }).toJsonString() }}')).toEqual(
				'{"test1":1,"test2":"2"}',
			);
		});

		describe('Conversion methods', () => {
			test('should exist but return undefined (to not break expressions with mixed data)', () => {
				expect(evaluate('={{ ({ test1: 1, test2: "2" }).toInt() }}')).toBeUndefined();
				expect(evaluate('={{ ({ test1: 1, test2: "2" }).toFloat() }}')).toBeUndefined();
				expect(evaluate('={{ ({ test1: 1, test2: "2" }).toBoolean() }}')).toBeUndefined();
				expect(evaluate('={{ ({ test1: 1, test2: "2" }).toDateTime() }}')).toBeUndefined();
			});

			it('should not have a doc (hidden from autocomplete)', () => {
				expect(objectExtensions.functions.toInt.doc).toBeUndefined();
				expect(objectExtensions.functions.toFloat.doc).toBeUndefined();
				expect(objectExtensions.functions.toBoolean.doc).toBeUndefined();
				expect(objectExtensions.functions.toDateTime.doc).toBeUndefined();
			});
		});
	});
});
