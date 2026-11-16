import { mockDeep } from 'vitest-mock-extended';
import type { GenericValue, IExecuteFunctions } from 'n8n-workflow';

import { Sort } from '../Sort.node';
import { compareNumericStrings, isNumericString } from '../utils';

describe('Sort node', () => {
	let node: Sort;
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	const setup = (typeVersion: number, order: 'ascending' | 'descending' = 'ascending') => {
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'sort-node',
			name: 'Sort',
			type: 'n8n-nodes-base.sort',
			typeVersion,
			position: [0, 0],
			parameters: {},
		});
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'type') return 'simple';
			if (name === 'sortFieldsUi') {
				return {
					sortField: [{ fieldName: 'value', order }],
				};
			}
			if (name === 'options.disableDotNotation') return false;
			return undefined;
		});
	};

	const sortValues = async (values: GenericValue[]) => {
		mockExecuteFunctions.getInputData.mockReturnValue(values.map((value) => ({ json: { value } })));
		const result = await node.execute.call(mockExecuteFunctions);
		return result[0].map((item) => item.json.value);
	};

	beforeEach(() => {
		node = new Sort();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		setup(1.1);
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
		{
			name: 'large integer strings',
			input: [
				{ json: { value: '9007199254740993' } },
				{ json: { value: '9007199254740992' } },
				{ json: { value: '9007199254740994' } },
			],
			expected: ['9007199254740992', '9007199254740993', '9007199254740994'],
		},
		{
			name: 'decimal strings',
			input: [{ json: { value: '10.5' } }, { json: { value: '2.5' } }, { json: { value: '7.5' } }],
			expected: ['2.5', '7.5', '10.5'],
		},
		{
			name: 'exponential strings',
			input: [{ json: { value: '1e3' } }, { json: { value: '2e2' } }, { json: { value: '5e1' } }],
			expected: ['5e1', '2e2', '1e3'],
		},
		{
			name: 'mixed text and numeric strings with the version 1 order',
			input: [
				{ json: { value: 'banana' } },
				{ json: { value: '9' } },
				{ json: { value: '10' } },
				{ json: { value: 'apple' } },
			],
			expected: ['10', '9', 'apple', 'banana'],
		},
		{
			name: 'numeric strings with a blank value with the version 1 order',
			input: [{ json: { value: '10' } }, { json: { value: '' } }, { json: { value: '2' } }],
			expected: ['', '10', '2'],
		},
	])('should sort $name correctly', async ({ input, expected }) => {
		mockExecuteFunctions.getInputData.mockReturnValue(input);

		const result = await node.execute.call(mockExecuteFunctions);

		expect(result[0].map((item) => item.json.value)).toEqual(expected);
	});

	it('should sort numeric strings in descending order', async () => {
		setup(1.1, 'descending');

		expect(await sortValues(['9', '100', '10'])).toEqual(['100', '10', '9']);
	});

	it.each([
		['ascending', ['10', '100', '9']],
		['descending', ['9', '100', '10']],
	] as const)('should keep the lexicographic %s order in version 1', async (order, expected) => {
		setup(1, order);

		expect(await sortValues(['9', '100', '10'])).toEqual(expected);
	});
});

describe('isNumericString', () => {
	it.each(['42', ' -3.5 ', '+7', '.5', '5.', '1e3', '2E-2'])('should accept %j', (value) => {
		expect(isNumericString(value)).toBe(true);
	});

	it.each(['', '   ', 'abc', '0x10', 'Infinity', '1,000', '1.2.3', 42, null, undefined])(
		'should reject %j',
		(value) => {
			expect(isNumericString(value)).toBe(false);
		},
	);
});

describe('compareNumericStrings', () => {
	it.each([
		['2', '10', -1],
		['10', '2', 1],
		['007', '7', 0],
		['-5', '3', -1],
		['1.5', '1.25', 1],
		['1e3', '999', 1],
		['9007199254740993', '9007199254740992', 1],
	] as const)('should compare %j with %j as %i', (a, b, expected) => {
		expect(compareNumericStrings(a, b)).toBe(expected);
	});
});
