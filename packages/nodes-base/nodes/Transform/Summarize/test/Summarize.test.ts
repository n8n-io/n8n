import {
	NodeOperationError,
	type IExecuteFunctions,
	type IDataObject,
	NodeExecutionOutput,
	type INodeExecutionData,
} from 'n8n-workflow';

import { testWorkflows, getWorkflowFilenames } from '@test/nodes/Helpers';

import { Summarize } from '../Summarize.node';
import { checkIfFieldExists, type Aggregations } from '../utils';

const workflows = getWorkflowFilenames(__dirname);
describe('Test Summarize Node', () => testWorkflows(workflows));

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	NodeExecutionOutput: jest.fn().mockImplementation((data) => ({
		data,
		at(index: number): INodeExecutionData {
			return (this.data as INodeExecutionData[])[index];
		},
	})),
}));

describe('Test Summarize Node, execute', () => {
	testWorkflows(workflows);

	let summarizeNode: Summarize;
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		summarizeNode = new Summarize();
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'test-node' }),
			getNodeParameter: jest.fn(),
			getInputData: jest.fn(),
		} as unknown as IExecuteFunctions;
	});

	it('should handle field not found with hints in version 1.1', async () => {
		const node = new Summarize();
		const context = {
			getNodeParameter: jest
				.fn()
				.mockReturnValueOnce({}) // options
				.mockReturnValueOnce('') // fieldsToSplitBy
				.mockReturnValueOnce([{ field: 'nonexistentField', aggregation: 'sum' }]), // fieldsToSummarize
			getInputData: jest.fn().mockReturnValue([{ json: { someField: 1 } }]),
			getNode: jest.fn().mockReturnValue({ typeVersion: 1.1 }),
		} as unknown as IExecuteFunctions;

		await node.execute.call(context);

		expect(NodeExecutionOutput).toHaveBeenCalledWith(
			expect.any(Array),
			expect.arrayContaining([
				expect.objectContaining({
					message: expect.stringContaining('nonexistentField'),
					location: 'outputPane',
				}),
			]),
		);
	});

	it('should throw error if node version is < 1.1 and fields not found', async () => {
		mockExecuteFunctions.getNode = jest.fn().mockReturnValue({ typeVersion: 1 });
		const items = [{ a: 1 }, { b: 2 }, { c: 3 }];
		const aggregations: Aggregations = [
			{ aggregation: 'sum', field: 'b' },
			{ aggregation: 'count', field: 'd' },
		];
		mockExecuteFunctions.getInputData = jest.fn().mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter = jest
			.fn()
			.mockReturnValueOnce({}) // options
			.mockReturnValueOnce('') // fieldsToSplitBy
			.mockReturnValueOnce(aggregations); // fieldsToSummarize
		await expect(async () => {
			await summarizeNode.execute.bind(mockExecuteFunctions)();
		}).rejects.toThrow(NodeOperationError);
	});
});

describe('Test Summarize Node, checkIfFieldExists', () => {
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue({ name: 'test-node' }),
		} as unknown as IExecuteFunctions;
	});

	const items = [{ a: 1 }, { b: 2 }, { c: 3 }];

	it('should not throw error if all fields exist', () => {
		const aggregations: Aggregations = [
			{ aggregation: 'sum', field: 'a' },
			{ aggregation: 'count', field: 'c' },
		];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).not.toThrow();
	});

	it('should throw NodeOperationError if any field does not exist', () => {
		const aggregations: Aggregations = [
			{ aggregation: 'sum', field: 'b' },
			{ aggregation: 'count', field: 'd' },
		];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).toThrow(NodeOperationError);
	});

	it("should throw NodeOperationError with error message containing the field name that doesn't exist", () => {
		const aggregations: Aggregations = [{ aggregation: 'count', field: 'D' }];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).toThrow("The field 'D' does not exist in any items");
	});

	it('should not throw error if field is empty string', () => {
		const aggregations: Aggregations = [{ aggregation: 'count', field: '' }];
		const getValue = (item: IDataObject, field: string) => item[field];
		expect(() => {
			checkIfFieldExists.call(mockExecuteFunctions, items, aggregations, getValue);
		}).not.toThrow();
	});
});
