import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { getDataSourceId } from '../../shared/GenericFunctions';

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
