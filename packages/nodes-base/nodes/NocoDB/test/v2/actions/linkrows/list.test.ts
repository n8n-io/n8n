import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/linkrows/list.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../../../v2/transport/index';

vi.mock('../../../../v2/transport/index', async () => {
	const originalModule = await vi.importActual<typeof _importType0>(
		'../../../../v2/transport/index',
	);
	return {
		...originalModule,
		apiRequest: { call: vi.fn() },
		apiRequestAllItems: { call: vi.fn() },
	};
});

describe('NocoDB Link Rows List Action', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockNode: INode;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: vi.fn(),
			getInputData: vi.fn(() => [{ json: {} }]),
			continueOnFail: vi.fn(() => false),
			helpers: {
				returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: vi.fn((items) => items),
			},
			getNode: vi.fn(() => mockNode),
		} as unknown as IExecuteFunctions;
		mockNode = {
			parameters: {},
			id: 'node1',
			name: 'NocoDB',
			type: 'n8n-nodes-base.nocodb',
			typeVersion: 1,
			position: [0, 0],
			disabled: false,
			credentials: {},
		};
		(apiRequest.call as Mock).mockClear();
		(apiRequestAllItems.call as Mock).mockClear();
	});

	describe('list', () => {
		it('should return linked rows with minimal parameters', async () => {
			const responseData = { records: [{ id: 'row1' }, { id: 'row2' }] };
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return false;
				if (name === 'limit') return 50;
				if (name === 'options') return {};
				return undefined;
			});
			(apiRequest.call as Mock).mockResolvedValue(responseData);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ id: 'row1' }, { id: 'row2' }]]);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/links/linkField1/record1',
				{},
				{ limit: 50 },
			);
		});

		it('should return all linked rows when returnAll is true', async () => {
			const responseData = [{ id: 'row1' }, { id: 'row2' }, { id: 'row3' }];
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return true;
				if (name === 'options') return {};
				return undefined;
			});
			(apiRequestAllItems.call as Mock).mockResolvedValue(responseData);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ id: 'row1' }, { id: 'row2' }, { id: 'row3' }]]);
			expect(apiRequestAllItems.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/links/linkField1/record1',
				{},
				{},
			);
		});

		it('should return linked rows with a specific limit', async () => {
			const responseData = { records: [{ id: 'row1' }, { id: 'row2' }] };
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return false;
				if (name === 'limit') return 2;
				if (name === 'options') return {};
				return undefined;
			});
			(apiRequest.call as Mock).mockResolvedValue(responseData);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ id: 'row1' }, { id: 'row2' }]]);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/links/linkField1/record1',
				{},
				{ limit: 2 },
			);
		});

		it('should return linked rows with selected fields', async () => {
			const responseData = { records: [{ id: 'row1', name: 'test1' }] };
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return false;
				if (name === 'limit') return 50;
				if (name === 'options')
					return {
						fields: {
							items: [{ field: { value: 'name' } }],
						},
					};
				return undefined;
			});
			(apiRequest.call as Mock).mockResolvedValue(responseData);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ id: 'row1', name: 'test1' }]]);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/links/linkField1/record1',
				{},
				{ limit: 50, fields: 'name' },
			);
		});

		it('should return linked rows with sorting', async () => {
			const responseData = { records: [{ id: 'row2' }, { id: 'row1' }] };
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return false;
				if (name === 'limit') return 50;
				if (name === 'options')
					return {
						sort: {
							property: [{ field: { value: 'id' }, direction: 'desc' }],
						},
					};
				return undefined;
			});
			(apiRequest.call as Mock).mockResolvedValue(responseData);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ id: 'row2' }, { id: 'row1' }]]);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/links/linkField1/record1',
				{},
				{ limit: 50, sort: JSON.stringify([{ field: 'id', direction: 'desc' }]) },
			);
		});

		it('should return linked rows with filter by formula', async () => {
			const responseData = { records: [{ id: 'row1', name: 'example' }] };
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return false;
				if (name === 'limit') return 50;
				if (name === 'options')
					return {
						where: '(name,like,example%)',
					};
				return undefined;
			});
			(apiRequest.call as Mock).mockResolvedValue(responseData);

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ id: 'row1', name: 'example' }]]);
			expect(apiRequest.call).toHaveBeenCalledWith(
				mockExecuteFunctions,
				'GET',
				'/api/v3/data/base1/table1/links/linkField1/record1',
				{},
				{ limit: 50, where: '(name,like,example%)' },
			);
		});

		it('should handle API errors gracefully', async () => {
			const errorMessage = 'NocoDB API Error: Something went wrong';
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return false;
				if (name === 'limit') return 50;
				if (name === 'options') return {};
				return undefined;
			});
			(mockExecuteFunctions.continueOnFail as Mock).mockReturnValue(true);
			(apiRequest.call as Mock).mockRejectedValue(new Error(errorMessage));

			const result = await execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ error: `Error: ${errorMessage}` }]]);
		});

		it('should throw NodeApiError when continueOnFail is false', async () => {
			const errorMessage = 'NocoDB API Error: Something went wrong';
			const mockError = new Error(errorMessage);
			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				if (name === 'id') return 'record1';
				if (name === 'returnAll') return false;
				if (name === 'limit') return 50;
				if (name === 'options') return {};
				return undefined;
			});
			(mockExecuteFunctions.continueOnFail as Mock).mockReturnValue(false);
			(apiRequest.call as Mock).mockRejectedValue(mockError);

			await expect(execute.call(mockExecuteFunctions)).rejects.toThrow(errorMessage);
		});
	});
});
