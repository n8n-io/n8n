import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../../v2/actions/rows/count.operation';
import { apiRequest, apiRequestAllItems } from '../../../../v2/transport';

jest.mock('../../../../v2/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v2/transport/index');
	return {
		...originalModule,
		apiRequest: { call: jest.fn() },
		apiRequestAllItems: { call: jest.fn() },
	};
});

describe('NocoDB Rows Count Action', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getInputData: jest.fn(() => [{ json: {} }]),
			continueOnFail: jest.fn(() => false),
			helpers: {
				returnJsonArray: jest.fn((data) => [data]),
			},
			getNode: jest.fn(() => {}),
		} as unknown as IExecuteFunctions;
		(apiRequest.call as jest.Mock).mockClear();
		(apiRequestAllItems.call as jest.Mock).mockClear();
	});

	it('should return the count of rows successfully with no options', async () => {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return {};
			return undefined;
		});
		(apiRequest.call as jest.Mock).mockResolvedValue({ count: 10 });

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
		expect(result).toEqual([[[{ count: 10 }]]]);
	});

	it('should return the count of rows successfully with where option', async () => {
		const options = { where: '(name,like,example%)' };
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return options;
			return undefined;
		});
		(apiRequest.call as jest.Mock).mockResolvedValue({ count: 5 });

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
		expect(result).toEqual([[[{ count: 5 }]]]);
	});

	it('should throw NodeApiError when apiRequest fails and continueOnFail is false', async () => {
		const error = new Error('API Error');
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return {};
			return undefined;
		});
		(apiRequest.call as jest.Mock).mockRejectedValue(error);
		(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);

		await expect(execute.call(mockExecuteFunctions)).rejects.toThrow('API Error');
		expect(mockExecuteFunctions.continueOnFail).toHaveBeenCalled();
	});

	it('should return error object when apiRequest fails and continueOnFail is true', async () => {
		const error = new Error('API Error');
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
			if (name === 'projectId') return 'base1';
			if (name === 'table') return 'table1';
			if (name === 'options') return {};
			return undefined;
		});
		(apiRequest.call as jest.Mock).mockRejectedValue(error);
		(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await execute.call(mockExecuteFunctions);

		expect(mockExecuteFunctions.continueOnFail).toHaveBeenCalled();
		expect(result).toEqual([[[{ error: 'Error: API Error' }]]]);
	});
});
