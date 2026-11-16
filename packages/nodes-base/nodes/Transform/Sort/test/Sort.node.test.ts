import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { Sort } from '../Sort.node';

describe('Sort node', () => {
	let node: Sort;
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		node = new Sort();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'sort-node',
			name: 'Sort',
			type: 'n8n-nodes-base.sort',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'type') return 'simple';
			if (name === 'sortFieldsUi') {
				return {
					sortField: [{ fieldName: 'value', order: 'ascending' }],
				};
			}
			if (name === 'options.disableDotNotation') return false;
			return undefined;
		});
	});

	it.each([
		{
			name: 'numbers',
			input: [{ json: { value: 30 } }, { json: { value: 2 } }, { json: { value: 10 } }],
			expected: [2, 10, 30],
		},
		{
			name: 'dates',
			input: [
				{ json: { value: new Date('2024-03-01') } },
				{ json: { value: new Date('2024-01-01') } },
				{ json: { value: new Date('2024-02-01') } },
			],
			expected: [new Date('2024-01-01'), new Date('2024-02-01'), new Date('2024-03-01')],
		},
		{
			name: 'numbers as strings',
			input: [{ json: { value: '10' } }, { json: { value: '9' } }, { json: { value: '100' } }],
			expected: ['9', '10', '100'],
		},
		{
			name: 'strings',
			input: [
				{ json: { value: 'banana' } },
				{ json: { value: 'apple' } },
				{ json: { value: 'cherry' } },
			],
			expected: ['apple', 'banana', 'cherry'],
		},
		{
			name: 'booleans',
			input: [{ json: { value: true } }, { json: { value: false } }, { json: { value: true } }],
			expected: [false, true, true],
		},
	])('should sort $name correctly', async ({ input, expected }) => {
		mockExecuteFunctions.getInputData.mockReturnValue(input);

		const result = await node.execute.call(mockExecuteFunctions);

		expect(result[0].map((item) => item.json.value)).toEqual(expected);
	});
});
