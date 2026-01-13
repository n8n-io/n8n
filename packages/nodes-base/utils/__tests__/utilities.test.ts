import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { MYSQL_NODE_TYPE, POSTGRES_NODE_TYPE } from 'n8n-workflow';

import {
	addExecutionHints,
	compareItems,
	flattenKeys,
	fuzzyCompare,
	getResolvables,
	keysToLowercase,
	removeTrailingSlash,
	shuffleArray,
	sortItemKeysByPriorityList,
	wrapData,
} from '@utils/utilities';

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

describe('Test getResolvables', () => {
	it('should return empty array when there are no resolvables', () => {
		expect(getResolvables('Plain String, no resolvables here.')).toEqual([]);
	});
	it('should properly handle resovables in SQL query', () => {
		expect(getResolvables('SELECT * FROM {{ $json.db }}.{{ $json.table }};')).toEqual([
			'{{ $json.db }}',
			'{{ $json.table }}',
		]);
	});
	it('should properly handle resovables in HTML string', () => {
		expect(
			getResolvables(
				`
				<!DOCTYPE html>
				<html>
					<head><title>{{ $json.pageTitle }}</title></head>
					<body><h1>{{ $json.heading }}</h1></body>
				<html>
				<style>
					body { height: {{ $json.pageHeight }}; }
				</style>
				<script>
					console.log('{{ $json.welcomeMessage }}');
				</script>
				`,
			),
		).toEqual([
			'{{ $json.pageTitle }}',
			'{{ $json.heading }}',
			'{{ $json.pageHeight }}',
			'{{ $json.welcomeMessage }}',
		]);
	});
});

describe('shuffleArray', () => {
	it('should shuffle array', () => {
		const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const toShuffle = [...array];
		shuffleArray(toShuffle);
		expect(toShuffle).not.toEqual(array);
		expect(toShuffle).toHaveLength(array.length);
		expect(toShuffle).toEqual(expect.arrayContaining(array));
	});
});

describe('flattenKeys', () => {
	const name = 'Lisa';
	const city1 = 'Berlin';
	const city2 = 'Schoenwald';
	const withNestedObject = {
		name,
		address: { city: city1 },
	};

	const withNestedArrays = {
		name,
		addresses: [{ city: city1 }, { city: city2 }],
	};

	it('should handle empty object', () => {
		const flattenedObj = flattenKeys({});
		expect(flattenedObj).toEqual({});
	});

	it('should flatten object with nested object', () => {
		const flattenedObj = flattenKeys(withNestedObject);
		expect(flattenedObj).toEqual({
			name,
			'address.city': city1,
		});
	});

	it('should handle object with nested arrays', () => {
		const flattenedObj = flattenKeys(withNestedArrays);
		expect(flattenedObj).toEqual({
			name,
			'addresses.0.city': city1,
			'addresses.1.city': city2,
		});
	});

	it('should flatten object with nested object and specified prefix', () => {
		const flattenedObj = flattenKeys(withNestedObject, ['test']);
		expect(flattenedObj).toEqual({
			'test.name': name,
			'test.address.city': city1,
		});
	});

	it('should handle object with nested arrays and specified prefix', () => {
		const flattenedObj = flattenKeys(withNestedArrays, ['test']);
		expect(flattenedObj).toEqual({
			'test.name': name,
			'test.addresses.0.city': city1,
			'test.addresses.1.city': city2,
		});
	});
});

describe('compareItems', () => {
	it('should return true if all values of specified keys are equal', () => {
		const obj1 = { json: { a: 1, b: 2, c: 3 } };
		const obj2 = { json: { a: 1, b: 2, c: 3 } };
		const keys = ['a', 'b', 'c'];
		const result = compareItems(obj1, obj2, keys);
		expect(result).toBe(true);
	});

	it('should return false if any values of specified keys are not equal', () => {
		const obj1 = { json: { a: 1, b: 2, c: 3 } };
		const obj2 = { json: { a: 1, b: 2, c: 4 } };
		const keys = ['a', 'b', 'c'];
		const result = compareItems(obj1, obj2, keys);
		expect(result).toBe(false);
	});

	it('should return true if all values of specified keys are equal using dot notation', () => {
		const obj1 = { json: { a: { b: { c: 1 } } } };
		const obj2 = { json: { a: { b: { c: 1 } } } };
		const keys = ['a.b.c'];
		const result = compareItems(obj1, obj2, keys);
		expect(result).toBe(true);
	});

	it('should return false if any values of specified keys are not equal using dot notation', () => {
		const obj1 = { json: { a: { b: { c: 1 } } } };
		const obj2 = { json: { a: { b: { c: 2 } } } };
		const keys = ['a.b.c'];
		const result = compareItems(obj1, obj2, keys);
		expect(result).toBe(false);
	});

	it('should return true if all values of specified keys are equal using bracket notation', () => {
		const obj1 = { json: { 'a.b': { 'c.d': 1 } } };
		const obj2 = { json: { 'a.b': { 'c.d': 1 } } };
		const keys = ['a.b.c.d'];
		const result = compareItems(obj1, obj2, keys, true);
		expect(result).toBe(true);
	});
});

describe('sortItemKeysByPriorityList', () => {
	it('should reorder keys based on priority list', () => {
		const data: INodeExecutionData[] = [{ json: { c: 3, a: 1, b: 2 } }];
		const priorityList = ['b', 'a'];

		const result = sortItemKeysByPriorityList(data, priorityList);

		expect(Object.keys(result[0].json)).toEqual(['b', 'a', 'c']);
	});

	it('should sort keys not in the priority list alphabetically', () => {
		const data: INodeExecutionData[] = [{ json: { c: 3, a: 1, b: 2, d: 4 } }];
		const priorityList = ['b', 'a'];

		const result = sortItemKeysByPriorityList(data, priorityList);

		expect(Object.keys(result[0].json)).toEqual(['b', 'a', 'c', 'd']);
	});

	it('should sort all keys alphabetically when priority list is empty', () => {
		const data: INodeExecutionData[] = [{ json: { c: 3, a: 1, b: 2 } }];
		const priorityList: string[] = [];

		const result = sortItemKeysByPriorityList(data, priorityList);

		expect(Object.keys(result[0].json)).toEqual(['a', 'b', 'c']);
	});

	it('should handle an empty data array', () => {
		const data: INodeExecutionData[] = [];
		const priorityList = ['b', 'a'];

		const result = sortItemKeysByPriorityList(data, priorityList);

		// Expect an empty array since there is no data
		expect(result).toEqual([]);
	});

	it('should handle a single object in the data array', () => {
		const data: INodeExecutionData[] = [{ json: { d: 4, b: 2, a: 1 } }];
		const priorityList = ['a', 'b', 'c'];

		const result = sortItemKeysByPriorityList(data, priorityList);

		expect(Object.keys(result[0].json)).toEqual(['a', 'b', 'd']);
	});

	it('should handle duplicate keys in the priority list gracefully', () => {
		const data: INodeExecutionData[] = [{ json: { d: 4, b: 2, a: 1 } }];
		const priorityList = ['a', 'b', 'a'];

		const result = sortItemKeysByPriorityList(data, priorityList);

		expect(Object.keys(result[0].json)).toEqual(['a', 'b', 'd']);
	});
});

describe('removeTrailingSlash', () => {
	it('removes trailing slash', () => {
		expect(removeTrailingSlash('https://example.com/')).toBe('https://example.com');
	});

	it('does not change a URL without trailing slash', () => {
		expect(removeTrailingSlash('https://example.com')).toBe('https://example.com');
	});
});

describe('addExecutionHints', () => {
	const executeQueryOperationContext = {
		getNodeParameter: (parameterName: string) => {
			if (parameterName === 'options.queryBatching') {
				return 'single';
			}
			if (parameterName === 'query') {
				return 'INSERT INTO my_test_table VALUES (`{{ $json.name }}`)';
			}
		},
		addExecutionHints: jest.fn(),
	} as unknown as IExecuteFunctions;

	const insertHint = {
		message:
			"Inserts were batched for performance. If you need to preserve item matching, consider changing 'Query batching' to 'Independent' in the options.",
		location: 'outputPane',
	};

	const selectHint = {
		location: 'outputPane',
		message:
			"This node ran 2 times, once for each input item. To run for the first item only, enable 'execute once' in the node settings",
	};

	it('should add batching insert hint to Postgres executeQuery operation', () => {
		addExecutionHints(
			executeQueryOperationContext,
			mock<INode>({
				type: POSTGRES_NODE_TYPE,
			}),
			[{ json: {} }, { json: {} }],
			'executeQuery',
			false,
		);
		expect(executeQueryOperationContext.addExecutionHints).toHaveBeenCalledWith(insertHint);
	});

	it('should add batching insert hint to MySql executeQuery operation', () => {
		addExecutionHints(
			executeQueryOperationContext,
			mock<INode>({
				type: MYSQL_NODE_TYPE,
			}),
			[{ json: {} }, { json: {} }],
			'executeQuery',
			false,
		);
		expect(executeQueryOperationContext.addExecutionHints).toHaveBeenCalledWith(insertHint);
	});

	it('should add run per item hint to Postgres select operation ', () => {
		const context = {
			addExecutionHints: jest.fn(),
		} as unknown as IExecuteFunctions;

		addExecutionHints(
			context,
			mock<INode>({
				type: POSTGRES_NODE_TYPE,
			}),
			[{ json: {} }, { json: {} }],
			'select',
			false,
		);
		expect(context.addExecutionHints).toHaveBeenCalledWith(selectHint);
	});

	it('should add run per item hint to MySQL select operation', () => {
		const context = {
			addExecutionHints: jest.fn(),
		} as unknown as IExecuteFunctions;

		addExecutionHints(
			context,
			mock<INode>({
				type: MYSQL_NODE_TYPE,
			}),
			[{ json: {} }, { json: {} }],
			'select',
			false,
		);
		expect(context.addExecutionHints).toHaveBeenCalledWith(selectHint);
	});
});
