import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { SplitOut } from '../SplitOut.node';

describe('Test Split Out Node', () => {
	new NodeTestHarness().setupTests();
});

describe('SplitOut', () => {
	const execute = async (fieldToSplitOut: string | string[] | number) => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([
			{
				json: {
					data: [{ id: 1 }, { id: 2 }],
					metadata: [{ name: 'first' }, { name: 'second' }],
				},
			},
		]);
		executeFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			if (parameterName === 'fieldToSplitOut') return fieldToSplitOut;
			if (parameterName === 'options') return {};
			if (parameterName === 'include') return 'noOtherFields';
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
});
