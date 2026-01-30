import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { sortByCode } from '../utils';

describe('Test Sort Node', () => {
	new NodeTestHarness().setupTests();
});

describe('sortByCode', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	const mockNode = { name: 'Sort', type: 'n8n-nodes-base.sort' };

	beforeEach(() => {
		mockExecuteFunctions = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn().mockReturnValue(mockNode),
			getMode: jest.fn().mockReturnValue('manual'),
		} as unknown as IExecuteFunctions;
	});

	describe('Multiple consecutive executions (stateful regex bug)', () => {
		it('should successfully validate code with return statement on multiple consecutive calls', () => {
			const code = 'return -1';
			const items: INodeExecutionData[] = [
				{ json: { value: 3 } },
				{ json: { value: 1 } },
				{ json: { value: 2 } },
			];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			// Call sortByCode multiple times consecutively
			// This tests the stateful regex bug where the global flag would cause
			// the regex to fail after 2-3 executions
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
		});

		it('should consistently throw error for code without return statement on multiple calls', () => {
			const code = 'a.json.value - b.json.value'; // Missing return statement
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			// Should consistently throw error on every call
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(NodeOperationError);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(
				"Sort code doesn't return. Please add a 'return' statement to your code",
			);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(NodeOperationError);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(
				"Sort code doesn't return. Please add a 'return' statement to your code",
			);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(NodeOperationError);
		});

		it('should handle alternating valid and invalid code correctly', () => {
			const validCode = 'return -1';
			const invalidCode = 'a.json.value - b.json.value';
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			// Alternate between valid and invalid code
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(validCode);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(invalidCode);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(NodeOperationError);

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(validCode);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(invalidCode);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(NodeOperationError);

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(validCode);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
		});
	});

	describe('Return statement validation', () => {
		it('should accept code with simple return statement', () => {
			const code = 'return a.json.value - b.json.value';
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
		});

		it('should accept code with return statement in conditional', () => {
			const code = 'if (a.json.value > b.json.value) return 1; return -1';
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
		});

		it('should accept code with multiple return statements', () => {
			const code =
				'if (a.json.value === b.json.value) return 0; return a.json.value - b.json.value';
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			expect(() => sortByCode.call(mockExecuteFunctions, items)).not.toThrow();
		});

		it('should throw error when return statement is missing', () => {
			const code = 'a.json.value - b.json.value';
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(NodeOperationError);
			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(
				"Sort code doesn't return. Please add a 'return' statement to your code",
			);
		});

		it('should not accept code with return as part of another word', () => {
			const code = 'notreturn a.json.value - b.json.value';
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			expect(() => sortByCode.call(mockExecuteFunctions, items)).toThrow(NodeOperationError);
		});
	});

	describe('Sorting functionality', () => {
		it('should sort items correctly with ascending order code', () => {
			const code = 'return a.json.value - b.json.value';
			const items: INodeExecutionData[] = [
				{ json: { value: 3 } },
				{ json: { value: 1 } },
				{ json: { value: 2 } },
			];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			const result = sortByCode.call(mockExecuteFunctions, items);

			expect(result).toEqual([
				{ json: { value: 1 } },
				{ json: { value: 2 } },
				{ json: { value: 3 } },
			]);
		});

		it('should sort items correctly with descending order code', () => {
			const code = 'return b.json.value - a.json.value';
			const items: INodeExecutionData[] = [
				{ json: { value: 1 } },
				{ json: { value: 3 } },
				{ json: { value: 2 } },
			];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			const result = sortByCode.call(mockExecuteFunctions, items);

			expect(result).toEqual([
				{ json: { value: 3 } },
				{ json: { value: 2 } },
				{ json: { value: 1 } },
			]);
		});

		it('should handle empty items array', () => {
			const code = 'return a.json.value - b.json.value';
			const items: INodeExecutionData[] = [];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			const result = sortByCode.call(mockExecuteFunctions, items);

			expect(result).toEqual([]);
		});

		it('should handle single item array', () => {
			const code = 'return a.json.value - b.json.value';
			const items: INodeExecutionData[] = [{ json: { value: 1 } }];

			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockReturnValue(code);

			const result = sortByCode.call(mockExecuteFunctions, items);

			expect(result).toEqual([{ json: { value: 1 } }]);
		});
	});
});
