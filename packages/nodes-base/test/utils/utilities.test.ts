import { fuzzyCompare, wrapData } from '../../utils/utilities';

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
