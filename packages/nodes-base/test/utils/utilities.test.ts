import { fuzzyCompare, keysToLowercase, wrapData } from '../../utils/utilities';

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

describe('Test wrapData', () => {
	it('should wrap object in json', () => {
		const data = {
			id: 1,
			name: 'Name',
		};
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data }]);
	});
	it('should wrap each object in array in json', () => {
		const data = [
			{
				id: 1,
				name: 'Name',
			},
			{
				id: 2,
				name: 'Name 2',
			},
		];
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data[0] }, { json: data[1] }]);
	});
	it('json key from source should be inside json', () => {
		const data = {
			json: {
				id: 1,
				name: 'Name',
			},
		};
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data }]);
		expect(Object.keys(wrappedData[0].json)).toContain('json');
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
