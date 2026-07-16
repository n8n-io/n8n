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

describe('SplitOut - Destination Field Name dot notation (issue #34053)', () => {
	const executeWithOptions = async (
		fieldToSplitOut: string,
		options: Record<string, unknown>,
		include: string = 'noOtherFields',
	) => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([
			{
				json: {
					myarraydata: [{ id: 1 }, { id: 2 }],
				},
			},
		]);
		executeFunctions.getNodeParameter.mockImplementation(((
			parameterName: string,
			_itemIndex?: number,
			fallback?: unknown,
		) => {
			if (parameterName === 'fieldToSplitOut') return fieldToSplitOut;
			if (parameterName === 'options') return options;
			if (parameterName === 'include') return include;
			return fallback;
		}) as IExecuteFunctions['getNodeParameter']);

		return await new SplitOut().execute.call(executeFunctions);
	};

	it('should place split contents under a nested path when destination uses dot notation', async () => {
		await expect(
			executeWithOptions('myarraydata', { destinationFieldName: 'data.foo' }),
		).resolves.toEqual([
			[
				{ json: { data: { foo: { id: 1 } } }, pairedItem: { item: 0 } },
				{ json: { data: { foo: { id: 2 } } }, pairedItem: { item: 0 } },
			],
		]);
	});

	it('should treat destination dots literally when dot notation is disabled', async () => {
		await expect(
			executeWithOptions('myarraydata', {
				destinationFieldName: 'data.foo',
				disableDotNotation: true,
			}),
		).resolves.toEqual([
			[
				{ json: { 'data.foo': { id: 1 } }, pairedItem: { item: 0 } },
				{ json: { 'data.foo': { id: 2 } }, pairedItem: { item: 0 } },
			],
		]);
	});
});
