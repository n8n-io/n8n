import { evaluate } from './Helpers';

describe('Data Transformation Functions', () => {
	describe('Object Data Transformation Functions', () => {
		test('.isEmpty() should work correctly on an object', () => {
			expect(evaluate('={{({}).isEmpty()}}')).toEqual(true);
			expect(evaluate('={{({ test1: 1 }).isEmpty()}}')).toEqual(false);
		});

		test('.hasField should work on an object', () => {
			expect(evaluate('={{ ({ test1: 1 }).hasField("test1") }}')).toEqual(true);
			expect(evaluate('={{ ({ test1: 1 }).hasField("test2") }}')).toEqual(false);
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

		test('.removeFieldsContaining should work on an object', () => {
			expect(
				evaluate(
					'={{ ({ test1: "i exist", test2: "i should be removed", test3: "i should also be removed" }).removeFieldsContaining("removed") }}',
				),
			).toEqual({
				test1: 'i exist',
			});
		});

		test('.removeFieldsContaining should not work for empty string', () => {
			expect(() =>
				evaluate(
					'={{ ({ test1: "i exist", test2: "i should be removed", test3: "i should also be removed" }).removeFieldsContaining("") }}',
				),
			).toThrow();
		});

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

		test('.compact should work on an object', () => {
			expect(
				evaluate('={{ ({ test1: 1, test2: "2", test3: undefined, test4: null }).compact() }}'),
			).toEqual({ test1: 1, test2: '2' });
		});

		test('.urlEncode should work on an object', () => {
			expect(evaluate('={{ ({ test1: 1, test2: "2" }).urlEncode() }}')).toEqual('test1=1&test2=2');
		});
	});
});
