import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/count.operation';
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

describe('NocoDB Rows Count Action', () => {
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

	it('should return the count of rows successfully with no options', async () => {
		(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return {};
			return undefined;
		});
		(apiRequest.call as Mock).mockResolvedValue({ count: 10 });

		const result = await execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('projectId', 0, undefined, {
			extractValue: true,
		});
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, {
			extractValue: true,
		});
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		expect(apiRequest.call).toHaveBeenCalledWith(
			mockExecuteFunctions,
			'GET',
			'/api/v3/data/base1/table1/count',
			{},
			{},
		);
		expect(result).toEqual([[{ count: 10 }]]);
	});

	it('should return the count of rows successfully with where option', async () => {
		const options = { where: '(name,like,example%)' };
		(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return options;
			return undefined;
		});
		(apiRequest.call as Mock).mockResolvedValue({ count: 5 });

		const result = await execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('projectId', 0, undefined, {
			extractValue: true,
		});
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('table', 0, undefined, {
			extractValue: true,
		});
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('options', 0, {});
		expect(apiRequest.call).toHaveBeenCalledWith(
			mockExecuteFunctions,
			'GET',
			'/api/v3/data/base1/table1/count',
			{},
			options,
		);
		expect(result).toEqual([[{ count: 5 }]]);
	});

	it('should throw NodeApiError when apiRequest fails and continueOnFail is false', async () => {
		const error = new Error('API Error');
		(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return {};
			return undefined;
		});
		(apiRequest.call as Mock).mockRejectedValue(error);
		(mockExecuteFunctions.continueOnFail as Mock).mockReturnValue(false);

		await expect(execute.call(mockExecuteFunctions)).rejects.toThrow('API Error');
		expect(mockExecuteFunctions.continueOnFail).toHaveBeenCalled();
	});

	it('should return error object when apiRequest fails and continueOnFail is true', async () => {
		const error = new Error('API Error');
		(mockExecuteFunctions.getNodeParameter as Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return {};
			return undefined;
		});
		(apiRequest.call as Mock).mockRejectedValue(error);
		(mockExecuteFunctions.continueOnFail as Mock).mockReturnValue(true);

		const result = await execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.continueOnFail).toHaveBeenCalled();
		expect(result).toEqual([[{ error: 'Error: API Error' }]]);
	});
});
