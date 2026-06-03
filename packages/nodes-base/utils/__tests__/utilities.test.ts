import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { MYSQL_NODE_TYPE, POSTGRES_NODE_TYPE } from 'n8n-workflow';

import {
	addExecutionHints,
	compareItems,
	flattenKeys,
	formatPrivateKey,
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

describe('Test formatPrivateKey', () => {
	it('should format compact private PEM blocks with wrapped body lines', () => {
		const compactKey = `-----BEGIN OPENSSH PRIVATE KEY-----${'A'.repeat(
			130,
		)}-----END OPENSSH PRIVATE KEY-----`;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN OPENSSH PRIVATE KEY-----
${'A'.repeat(64)}
${'A'.repeat(64)}
${'A'.repeat(2)}
-----END OPENSSH PRIVATE KEY-----`);
	});

	it('should format compact public PEM blocks with wrapped body lines', () => {
		const compactKey = `-----BEGIN PUBLIC KEY-----${'B'.repeat(66)}-----END PUBLIC KEY-----`;

		expect(formatPrivateKey(compactKey, true)).toBe(`-----BEGIN PUBLIC KEY-----
${'B'.repeat(64)}
${'B'.repeat(2)}
-----END PUBLIC KEY-----`);
	});

	it('should keep multiline PEM blocks unchanged', () => {
		const multilineKey = `-----BEGIN OPENSSH PRIVATE KEY-----
ABC
-----END OPENSSH PRIVATE KEY-----`;

		expect(formatPrivateKey(multilineKey)).toBe(multilineKey);
	});

	it('should return empty string for empty input', () => {
		expect(formatPrivateKey('')).toBe('');
	});

	it('should format compact RSA PRIVATE KEY block', () => {
		const compactKey = `-----BEGIN RSA PRIVATE KEY-----${'C'.repeat(64)}-----END RSA PRIVATE KEY-----`;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN RSA PRIVATE KEY-----
${'C'.repeat(64)}
-----END RSA PRIVATE KEY-----`);
	});

	it('should format compact EC PRIVATE KEY block', () => {
		const compactKey = `-----BEGIN EC PRIVATE KEY-----${'D'.repeat(70)}-----END EC PRIVATE KEY-----`;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN EC PRIVATE KEY-----
${'D'.repeat(64)}
${'D'.repeat(6)}
-----END EC PRIVATE KEY-----`);
	});

	it('should format compact CERTIFICATE block', () => {
		const compactCert = `-----BEGIN CERTIFICATE-----${'E'.repeat(128)}-----END CERTIFICATE-----`;

		expect(formatPrivateKey(compactCert)).toBe(`-----BEGIN CERTIFICATE-----
${'E'.repeat(64)}
${'E'.repeat(64)}
-----END CERTIFICATE-----`);
	});

	it('should strip surrounding whitespace before formatting compact PEM', () => {
		const compactKey = `   -----BEGIN OPENSSH PRIVATE KEY-----${'A'.repeat(
			64,
		)}-----END OPENSSH PRIVATE KEY-----   `;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN OPENSSH PRIVATE KEY-----
${'A'.repeat(64)}
-----END OPENSSH PRIVATE KEY-----`);
	});

	it('should convert escaped \\n sequences in compact body to newlines', () => {
		const compactKey = `-----BEGIN PRIVATE KEY-----\\n${'F'.repeat(64)}\\n${'F'.repeat(
			32,
		)}\\n-----END PRIVATE KEY-----`;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN PRIVATE KEY-----
${'F'.repeat(64)}
${'F'.repeat(32)}
-----END PRIVATE KEY-----`);
	});

	it('should preserve compact certificate chain structure (chain guard)', () => {
		const chain = `-----BEGIN CERTIFICATE-----${'A'.repeat(
			10,
		)}-----END CERTIFICATE----------BEGIN CERTIFICATE-----${'B'.repeat(
			10,
		)}-----END CERTIFICATE-----`;

		expect(formatPrivateKey(chain)).toBe(chain);
	});

	it('should preserve multi-line certificate chain unchanged', () => {
		const chain = `-----BEGIN CERTIFICATE-----
AAA
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
BBB
-----END CERTIFICATE-----`;

		expect(formatPrivateKey(chain)).toBe(chain);
	});

	it('should not match when BEGIN/END labels differ', () => {
		const mismatched = `-----BEGIN RSA PRIVATE KEY-----${'A'.repeat(
			64,
		)}-----END EC PRIVATE KEY-----`;

		expect(formatPrivateKey(mismatched)).toBe(mismatched);
	});

	it('should keep a multiline encrypted PEM with Proc-Type/DEK-Info unchanged', () => {
		const encrypted = `-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-256-CBC,1234567890ABCDEF

${'X'.repeat(64)}
-----END RSA PRIVATE KEY-----`;

		expect(formatPrivateKey(encrypted)).toBe(encrypted);
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
