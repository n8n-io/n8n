import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData, INodeTypeBaseDescription } from 'n8n-workflow';

import { RemoveDuplicatesV2 } from '../RemoveDuplicatesV2.node';
import type { Mock } from 'vitest';

describe('RemoveDuplicatesV2', () => {
	let node: RemoveDuplicatesV2;
	let executeFunctions: IExecuteFunctions;

	beforeEach(() => {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Remove Duplicates',
			name: 'removeDuplicates',
			icon: 'node:remove-duplicates',
			group: ['transform'],
			description: 'Delete items with matching field values',
		};
		node = new RemoveDuplicatesV2(baseDescription);
		executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.helpers = {
			checkProcessedAndRecord: vi.fn(),
			clearAllProcessedItems: vi.fn(),
		} as any;
		executeFunctions.getInputData = vi.fn();
		executeFunctions.getNodeParameter = vi.fn();
	});

	it('should Remove items repeated within current input based on all fields', async () => {
		const items: INodeExecutionData[] = [
			{ json: { id: 1, name: 'John' } },
			{ json: { id: 2, name: 'Jane' } },
			{ json: { id: 1, name: 'John' } },
		];

		(executeFunctions.getInputData as Mock<any>).mockReturnValue(items);
		(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'removeDuplicateInputItems';
			if (paramName === 'compare') return 'allFields';
			return undefined;
		});

		const result = await node.execute.call(executeFunctions);
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ id: 1, name: 'John' });
		expect(result[0][1].json).toEqual({ id: 2, name: 'Jane' });
	});

	it('should Remove items repeated within current input based on selected fields', async () => {
		const items: INodeExecutionData[] = [
			{ json: { id: 1, name: 'John' } },
			{ json: { id: 2, name: 'Jane' } },
			{ json: { id: 1, name: 'Doe' } },
		];

		(executeFunctions.getInputData as Mock).mockReturnValue(items);
		(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'removeDuplicateInputItems';
			if (paramName === 'compare') return 'selectedFields';
			if (paramName === 'fieldsToCompare') return 'id';
			return undefined;
		});

		const result = await node.execute.call(executeFunctions);
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ id: 1, name: 'John' });
		expect(result[0][1].json).toEqual({ id: 2, name: 'Jane' });
	});

	it('should remove items seen in previous executions', async () => {
		const items: INodeExecutionData[] = [
			{ json: { id: 1, name: 'John' } },
			{ json: { id: 2, name: 'Jane' } },
			{ json: { id: 3, name: 'Doe' } },
		];

		(executeFunctions.getInputData as Mock).mockReturnValue(items);
		(executeFunctions.getNodeParameter as Mock).mockImplementation(
			(paramName: string, itemIndex: number) => {
				if (paramName === 'operation') return 'removeItemsSeenInPreviousExecutions';
				if (paramName === 'logic') return 'removeItemsWithAlreadySeenKeyValues';
				if (paramName === 'dedupeValue' && itemIndex === 0) return 1;
				if (paramName === 'dedupeValue' && itemIndex === 1) return 2;
				if (paramName === 'dedupeValue' && itemIndex === 2) return 3;
				if (paramName === 'options.scope') return 'node';
				if (paramName === 'options.historySize') return 10;
			},
		);
		executeFunctions.helpers.getProcessedDataCount = vi.fn().mockReturnValue(3);
		(executeFunctions.helpers.checkProcessedAndRecord as Mock).mockReturnValue({
			new: [1, 3],
			processed: [2],
		});

		const result = await node.execute.call(executeFunctions);
		expect(result).toHaveLength(2);
		expect(result[0]).toHaveLength(2);
		expect(result[1]).toHaveLength(1);
		expect(result[0][0].json).toEqual({ id: 1, name: 'John' });
		expect(result[0][1].json).toEqual({ id: 3, name: 'Doe' });
	});

	it('should clean database when managing key values', async () => {
		const items: INodeExecutionData[] = [
			{ json: { id: 1, name: 'John' } },
			{ json: { id: 2, name: 'Jane' } },
		];

		(executeFunctions.getInputData as Mock).mockReturnValue(items);
		(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'clearDeduplicationHistory';
			if (paramName === 'mode') return 'cleanDatabase';
			if (paramName === 'options.scope') return 'node';
			return undefined;
		});

		const result = await node.execute.call(executeFunctions);
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ id: 1, name: 'John' });
		expect(result[0][1].json).toEqual({ id: 2, name: 'Jane' });
	});
});
