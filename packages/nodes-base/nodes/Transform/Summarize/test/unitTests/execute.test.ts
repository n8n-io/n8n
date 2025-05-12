import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Summarize } from '../../Summarize.node';
import type { Aggregations } from '../../utils';

let summarizeNode: Summarize;
let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

describe('Test Summarize Node, execute', () => {
	beforeEach(() => {
		summarizeNode = new Summarize();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			getNode: jest.fn().mockReturnValue({ name: 'test-node' }),
			getNodeParameter: jest.fn(),
			getInputData: jest.fn(),
			helpers: {
				constructExecutionMetaData: jest.fn().mockReturnValue([]),
			},
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should handle field not found with hints if version > 1', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { someField: 1 } }]);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: '1',
			name: 'test-node',
			type: 'test-type',
			position: [0, 0],
			parameters: {},
			typeVersion: 1.1,
		});
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('') // fieldsToSplitBy
			.mockReturnValueOnce([{ field: 'nonexistentField', aggregation: 'sum' }]); // fieldsToSummarize

		const result = await summarizeNode.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { sum_nonexistentField: 0 }, pairedItem: [{ item: 0 }] }]]);
		expect(mockExecuteFunctions.addExecutionHints).toHaveBeenCalledWith({
			location: 'outputPane',
			message: "The field 'nonexistentField' does not exist in any items",
		});
	});

	it('should throw error if node version is < 1.1 and fields not found', async () => {
		const items = [{ json: { a: 1, b: 2, c: 3 } }];
		const aggregations: Aggregations = [
			{ aggregation: 'sum', field: 'b' },
			{ aggregation: 'count', field: 'd' },
		];

		mockExecuteFunctions.getNode.mockReturnValue({
			id: '1',
			name: 'test-node',
			type: 'test-type',
			position: [0, 0],
			parameters: {},
			typeVersion: 1,
		});
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('') // fieldsToSplitBy
			.mockReturnValueOnce(aggregations); // fieldsToSummarize
		await expect(async () => {
			await summarizeNode.execute.bind(mockExecuteFunctions)();
		}).rejects.toThrow(NodeOperationError);
	});
});
