import { fuzzyCompare, keysToLowercase } from '../../utils/utilities';

//most test cases for fuzzyCompare are done in Compare Datasets node tests
describe('Test fuzzyCompare', () => {
	it('should do strict comparison', () => {
		const compareFunction = fuzzyCompare(false);

		expect(compareFunction(1, '1')).toEqual(false);
	});

	it('should do fuzzy comparison', () => {
		const compareFunction = fuzzyCompare(true);

		expect(compareFunction(1, '1')).toEqual(true);
	});

	it('should treat null, 0 and "0" as equal', () => {
		const compareFunction = fuzzyCompare(true, 2);

		expect(compareFunction(null, null)).toEqual(true);
		expect(compareFunction(null, 0)).toEqual(true);
		expect(compareFunction(null, '0')).toEqual(true);
	});

	it('should not treat null, 0 and "0" as equal', () => {
		const compareFunction = fuzzyCompare(true);

		expect(compareFunction(null, 0)).toEqual(false);
		expect(compareFunction(null, '0')).toEqual(false);
	});
});

describe('Test keysToLowercase', () => {
	it('should convert keys to lowercase', () => {
		const headers = {
			'Content-Type': 'application/json',
			'X-Test-Header': 'Test',
			Accept: 'application/json',
		};

		const newHeaders = keysToLowercase(headers);

		expect(newHeaders).toEqual({
			'content-type': 'application/json',
			'x-test-header': 'Test',
			accept: 'application/json',
		});
	});
	it('should return original value if it is not an object', () => {
		const test1 = keysToLowercase(['hello']);
		const test2 = keysToLowercase('test');
		const test3 = keysToLowercase(1);
		const test4 = keysToLowercase(true);
		const test5 = keysToLowercase(null);
		const test6 = keysToLowercase(undefined);

		expect(test1).toEqual(['hello']);
		expect(test2).toEqual('test');
		expect(test3).toEqual(1);
		expect(test4).toEqual(true);
		expect(test5).toEqual(null);
		expect(test6).toEqual(undefined);
	});
});
