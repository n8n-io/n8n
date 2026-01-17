import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	getDataSourceId,
	isObject,
	isObjectWithProperty,
	isArrayOfObjects,
} from '../../shared/GenericFunctions';

describe('Test NotionV3, getDataSourceId', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	const databaseId = '138fb9cb-4cf0-804c-8663-d8ecdd5e692f';
	const dataSourceId = '248fb9cb-5cf0-904c-9774-e9fddecce803';

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(
			mock<INode>({ name: 'Notion', type: 'notion', typeVersion: 3 }),
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return first data source ID from multi-source database', async () => {
		const databaseResponse = {
			object: 'database',
			id: databaseId,
			data_sources: [
				{
					id: dataSourceId,
					name: 'Main Data Source',
					type: 'data_source',
				},
				{
					id: '348fb9cb-6cf0-a05c-a885-f0gedfddf914',
					name: 'Secondary Data Source',
					type: 'data_source',
				},
			],
		};

		mockExecuteFunctions.helpers = {
			requestWithAuthentication: jest.fn().mockResolvedValue(databaseResponse),
		} as any;

		const result = await getDataSourceId.call(mockExecuteFunctions, databaseId, 0);

		expect(result).toBe(dataSourceId);
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'notionApi',
			expect.objectContaining({
				method: 'GET',
				uri: `https://api.notion.com/v1/databases/${databaseId}`,
			}),
		);
	});

	it('should return database ID when data_sources array is not present (single-source fallback)', async () => {
		const databaseResponse = {
			object: 'database',
			id: databaseId,
			// No data_sources array - older single-source database
		};

		mockExecuteFunctions.helpers = {
			requestWithAuthentication: jest.fn().mockResolvedValue(databaseResponse),
		} as any;

		const result = await getDataSourceId.call(mockExecuteFunctions, databaseId, 0);

		expect(result).toBe(databaseId);
	});

	it('should throw error when database has empty data_sources array', async () => {
		const databaseResponse = {
			object: 'database',
			id: databaseId,
			data_sources: [],
		};

		mockExecuteFunctions.helpers = {
			requestWithAuthentication: jest.fn().mockResolvedValue(databaseResponse),
		} as any;

		await expect(getDataSourceId.call(mockExecuteFunctions, databaseId, 0)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(getDataSourceId.call(mockExecuteFunctions, databaseId, 0)).rejects.toThrow(
			`Database ${databaseId} has no data sources`,
		);
	});

	it('should handle API errors correctly', async () => {
		const apiError = {
			message: 'Database not found',
			code: 'object_not_found',
		};

		mockExecuteFunctions.helpers = {
			requestWithAuthentication: jest.fn().mockRejectedValue(apiError),
		} as any;

		await expect(getDataSourceId.call(mockExecuteFunctions, databaseId, 0)).rejects.toThrow(
			NodeApiError,
		);
	});

	it('should pass correct item index in error context', async () => {
		const databaseResponse = {
			object: 'database',
			id: databaseId,
			data_sources: [],
		};

		mockExecuteFunctions.helpers = {
			requestWithAuthentication: jest.fn().mockResolvedValue(databaseResponse),
		} as any;

		try {
			await getDataSourceId.call(mockExecuteFunctions, databaseId, 5);
			fail('Should have thrown an error');
		} catch (error) {
			expect(error).toBeInstanceOf(NodeOperationError);
			expect((error as NodeOperationError).context.itemIndex).toBe(5);
		}
	});
});

describe('Test NotionV3, Type Guards', () => {
	describe('isObject', () => {
		it('should return true for plain objects', () => {
			expect(isObject({})).toBe(true);
			expect(isObject({ key: 'value' })).toBe(true);
			expect(isObject({ nested: { prop: 1 } })).toBe(true);
		});

		it('should return false for null', () => {
			expect(isObject(null)).toBe(false);
		});

		it('should return false for arrays', () => {
			expect(isObject([])).toBe(false);
			expect(isObject([1, 2, 3])).toBe(false);
			expect(isObject([{ key: 'value' }])).toBe(false);
		});

		it('should return false for primitives', () => {
			expect(isObject(undefined)).toBe(false);
			expect(isObject(true)).toBe(false);
			expect(isObject(false)).toBe(false);
			expect(isObject(42)).toBe(false);
			expect(isObject('string')).toBe(false);
			expect(isObject(Symbol('test'))).toBe(false);
		});

		it('should return false for functions', () => {
			expect(isObject(() => {})).toBe(false);
			expect(isObject(function test() {})).toBe(false);
		});
	});

	describe('isObjectWithProperty', () => {
		it('should return true when property exists', () => {
			expect(isObjectWithProperty({ key: 'value' }, 'key')).toBe(true);
			expect(isObjectWithProperty({ nested: { prop: 1 } }, 'nested')).toBe(true);
			expect(isObjectWithProperty({ empty: undefined }, 'empty')).toBe(true);
		});

		it('should return false when property is missing', () => {
			expect(isObjectWithProperty({}, 'key')).toBe(false);
			expect(isObjectWithProperty({ other: 'value' }, 'key')).toBe(false);
		});

		it('should return false for non-objects', () => {
			expect(isObjectWithProperty(null, 'key')).toBe(false);
			expect(isObjectWithProperty(undefined, 'key')).toBe(false);
			expect(isObjectWithProperty('string', 'length')).toBe(false);
			expect(isObjectWithProperty(42, 'toString')).toBe(false);
			expect(isObjectWithProperty([], 'length')).toBe(false);
		});

		it('should handle nested property checks', () => {
			const obj = { level1: { level2: { level3: 'value' } } };
			expect(isObjectWithProperty(obj, 'level1')).toBe(true);
			expect(isObjectWithProperty(obj.level1, 'level2')).toBe(true);
			expect(isObjectWithProperty(obj, 'level2')).toBe(false);
		});
	});

	describe('isArrayOfObjects', () => {
		it('should return true for array of objects', () => {
			expect(isArrayOfObjects([{}])).toBe(true);
			expect(isArrayOfObjects([{ key: 'value' }])).toBe(true);
			expect(isArrayOfObjects([{ a: 1 }, { b: 2 }, { c: 3 }])).toBe(true);
		});

		it('should return true for empty arrays', () => {
			expect(isArrayOfObjects([])).toBe(true);
		});

		it('should return false for mixed arrays', () => {
			expect(isArrayOfObjects([{}, null])).toBe(false);
			expect(isArrayOfObjects([{ key: 'value' }, 'string'])).toBe(false);
			expect(isArrayOfObjects([1, 2, 3])).toBe(false);
			expect(isArrayOfObjects([{}, []])).toBe(false);
		});

		it('should return false for arrays with nested arrays', () => {
			expect(isArrayOfObjects([[]])).toBe(false);
			expect(isArrayOfObjects([{ key: 'value' }, [{ nested: 'obj' }]])).toBe(false);
		});

		it('should return false for non-arrays', () => {
			expect(isArrayOfObjects(null)).toBe(false);
			expect(isArrayOfObjects(undefined)).toBe(false);
			expect(isArrayOfObjects({})).toBe(false);
			expect(isArrayOfObjects('string')).toBe(false);
			expect(isArrayOfObjects(42)).toBe(false);
		});
	});
});
