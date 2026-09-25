import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { SplitOut } from '../SplitOut.node';

describe('Test Split Out Node', () => {
	new NodeTestHarness().setupTests();
});

describe('SplitOut', () => {
	const execute = async (
		fieldToSplitOut: string | string[] | number,
		{
			inputData = {
				data: [{ id: 1 }, { id: 2 }],
				metadata: [{ name: 'first' }, { name: 'second' }],
			},
			options = {},
			include = 'noOtherFields',
			fieldsToInclude = '',
			typeVersion = 1.1,
		}: {
			inputData?: IDataObject;
			options?: IDataObject;
			include?: 'selectedOtherFields' | 'allOtherFields' | 'noOtherFields';
			fieldsToInclude?: string;
			typeVersion?: number;
		} = {},
	) => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([{ json: inputData }]);
		executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion }));
		executeFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			if (parameterName === 'fieldToSplitOut') return fieldToSplitOut;
			if (parameterName === 'options') return options;
			if (parameterName === 'include') return include;
			if (parameterName === 'fieldsToInclude') return fieldsToInclude;
			return undefined;
		});

		return await new SplitOut().execute.call(executeFunctions);
	};

	it('should split a field provided as a string', async () => {
		await expect(execute('data, metadata')).resolves.toEqual([
			[
				{
					json: { data: { id: 1 }, metadata: { name: 'first' } },
					pairedItem: { item: 0 },
				},
				{
					json: { data: { id: 2 }, metadata: { name: 'second' } },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should split fields provided as an array', async () => {
		await expect(execute(['data', 'metadata'])).resolves.toEqual([
			[
				{
					json: { data: { id: 1 }, metadata: { name: 'first' } },
					pairedItem: { item: 0 },
				},
				{
					json: { data: { id: 2 }, metadata: { name: 'second' } },
					pairedItem: { item: 0 },
				},
			],
		]);
	});

	it('should throw when fields to split out have an invalid type', async () => {
		await expect(execute(123)).rejects.toThrow(
			"The 'Fields To Split Out' parameter must be a string of fields separated by commas or an array of strings.",
		);
	});

	it('should use dot notation for the destination field', async () => {
		await expect(
			execute('data', { options: { destinationFieldName: 'output.item' } }),
		).resolves.toEqual([
			[
				{ json: { output: { item: { id: 1 } } }, pairedItem: { item: 0 } },
				{ json: { output: { item: { id: 2 } } }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('should keep the destination field literal when dot notation is disabled', async () => {
		await expect(
			execute('data', {
				options: { destinationFieldName: 'output.item', disableDotNotation: true },
			}),
		).resolves.toEqual([
			[
				{ json: { 'output.item': { id: 1 } }, pairedItem: { item: 0 } },
				{ json: { 'output.item': { id: 2 } }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('should preserve literal destination fields in version 1', async () => {
		await expect(
			execute('data', {
				options: { destinationFieldName: 'output.item' },
				typeVersion: 1,
			}),
		).resolves.toEqual([
			[
				{ json: { 'output.item': { id: 1 } }, pairedItem: { item: 0 } },
				{ json: { 'output.item': { id: 2 } }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('should preserve included fields under the destination parent', async () => {
		await expect(
			execute('data.items', {
				inputData: { data: { items: [1, 2], keep: 'value' } },
				options: { destinationFieldName: 'data.item' },
				include: 'allOtherFields',
			}),
		).resolves.toEqual([
			[
				{ json: { data: { keep: 'value', item: 1 } }, pairedItem: { item: 0 } },
				{ json: { data: { keep: 'value', item: 2 } }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('should not mutate input data when destination paths overlap', async () => {
		const inputData = {
			left: [{ keep: true }],
			right: [1],
		};

		await expect(
			execute('left, right', {
				inputData,
				options: { destinationFieldName: 'output, output.value' },
			}),
		).resolves.toEqual([
			[
				{
					json: { output: { keep: true, value: 1 } },
					pairedItem: { item: 0 },
				},
			],
		]);
		expect(inputData.left).toEqual([{ keep: true }]);
	});

	it('should not mutate selected fields under the destination parent', async () => {
		const inputData = {
			items: [1],
			output: { keep: true },
		};

		await expect(
			execute('items', {
				inputData,
				options: { destinationFieldName: 'output.value' },
				include: 'selectedOtherFields',
				fieldsToInclude: 'output',
			}),
		).resolves.toEqual([
			[
				{
					json: { output: { keep: true, value: 1 } },
					pairedItem: { item: 0 },
				},
			],
		]);
		expect(inputData.output).toEqual({ keep: true });
	});
});
