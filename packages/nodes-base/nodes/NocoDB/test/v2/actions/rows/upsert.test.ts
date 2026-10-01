import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/upsert.operation';
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

describe('NocoDB Rows Upsert Action', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: vi.fn(),
			getInputData: vi.fn(() => [{ json: {} }]),
			continueOnFail: vi.fn(() => false),
			helpers: {
				returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: vi.fn((items) => items),
			},
			getNode: vi.fn(() => {}),
		} as unknown as IExecuteFunctions;
		(apiRequest.call as Mock).mockClear();
		(apiRequestAllItems.call as Mock).mockClear();
	});

	describe('create part', () => {
		it('should create a row with autoMapInputData', async () => {
			const mockBase = 'base1';
			const mockTable = 'table1';
			const mockColumnsToInsert = {
				column1: 'value1',
				column2: 'value2',
			};
			const mockResponseData = {
				id: 1,
				fields: mockColumnsToInsert,
			};

			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				if (paramName === 'projectId') return mockBase;
				if (paramName === 'table') return mockTable;
				if (paramName === 'dataToSend') return 'autoMapInputData';
				if (paramName === 'inputsToIgnore') return '';
				return undefined;
			});
			(mockExecuteFunctions.getInputData as Mock).mockReturnValue([
				{
					json: {
						fields: mockColumnsToInsert,
					},
				},
			]);
			(apiRequest.call as Mock).mockResolvedValue({ records: [mockResponseData] });

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'table',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				`/api/v3/data/${mockBase}/${mockTable}/records`,
				[
					{
						fields: mockColumnsToInsert,
					},
				],
				{},
			);
			expect(result).toEqual([[mockResponseData]]);
		});

		it('should create a row with defineBelow and fieldsMapper', async () => {
			const mockBase = 'base1';
			const mockTable = 'table1';
			const mockFieldsMapper = {
				schema: [{ id: 'Title' }],
				value: {
					Title: 'Hello world',
				},
			};
			const mockColumnsToInsert = {
				Title: 'Hello world',
			};
			const mockResponseData = {
				id: 1,
				fields: mockColumnsToInsert,
			};

			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				if (paramName === 'projectId') return mockBase;
				if (paramName === 'table') return mockTable;
				if (paramName === 'dataToSend') return 'defineBelow';
				if (paramName === 'fieldsMapper') return mockFieldsMapper;
				return undefined;
			});
			(mockExecuteFunctions.getInputData as Mock).mockReturnValue([
				{
					json: {},
				},
			]);
			(mockExecuteFunctions.helpers.returnJsonArray as Mock).mockImplementation((data) => data);
			(apiRequest.call as Mock).mockResolvedValue({ records: [mockResponseData] });

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'table',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'fieldsMapper',
				0,
				expect.anything(),
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'POST',
				`/api/v3/data/${mockBase}/${mockTable}/records`,
				[
					{
						fields: mockColumnsToInsert,
					},
				],
				{},
			);
			expect(result).toEqual([[mockResponseData]]);
		});
	});

	describe('update part', () => {
		it('should create a row with autoMapInputData', async () => {
			const mockBase = 'base1';
			const mockTable = 'table1';
			const mockColumnsToInsert = {
				column1: 'value1',
				column2: 'value2',
			};
			const mockResponseData = {
				id: 1,
				fields: mockColumnsToInsert,
			};

			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				if (paramName === 'projectId') return mockBase;
				if (paramName === 'table') return mockTable;
				if (paramName === 'dataToSend') return 'autoMapInputData';
				if (paramName === 'id') return '1';
				if (paramName === 'inputsToIgnore') return '';
				return undefined;
			});
			(mockExecuteFunctions.getInputData as Mock).mockReturnValue([
				{
					json: {
						fields: mockColumnsToInsert,
					},
				},
			]);
			(apiRequest.call as Mock).mockResolvedValue({ records: [mockResponseData] });

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'table',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'id',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'PATCH',
				`/api/v3/data/${mockBase}/${mockTable}/records`,
				[
					{
						id: '1',
						fields: mockColumnsToInsert,
					},
				],
				{},
			);
			expect(result).toEqual([[mockResponseData]]);
		});

		it('should create a row with defineBelow and fieldsMapper', async () => {
			const mockBase = 'base1';
			const mockTable = 'table1';
			const mockFieldsMapper = {
				schema: [{ id: 'Title' }],
				value: {
					Title: 'Hello world',
				},
			};
			const mockColumnsToInsert = {
				Title: 'Hello world',
			};
			const mockResponseData = {
				id: 1,
				fields: mockColumnsToInsert,
			};

			(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				if (paramName === 'projectId') return mockBase;
				if (paramName === 'table') return mockTable;
				if (paramName === 'dataToSend') return 'defineBelow';
				if (paramName === 'fieldsMapper') return mockFieldsMapper;
				if (paramName === 'id') return '1';
				return undefined;
			});
			(mockExecuteFunctions.getInputData as Mock).mockReturnValue([
				{
					json: {},
				},
			]);
			(mockExecuteFunctions.helpers.returnJsonArray as Mock).mockImplementation((data) => data);
			(apiRequest.call as Mock).mockResolvedValue({ records: [mockResponseData] });

			const result = await execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'projectId',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'table',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'id',
				0,
				undefined,
				expect.anything(),
			);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('dataToSend', 0);
			expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith(
				'fieldsMapper',
				0,
				expect.anything(),
			);
			expect(apiRequest.call).toHaveBeenCalledWith(
				expect.anything(),
				'PATCH',
				`/api/v3/data/${mockBase}/${mockTable}/records`,
				[
					{
						id: '1',
						fields: mockColumnsToInsert,
					},
				],
				{},
			);
			expect(result).toEqual([[mockResponseData]]);
		});
	});
});
