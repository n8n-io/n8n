import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { expect, it, vi } from 'vitest';

import { Sort } from '../Sort.node';

describe('Test Sort Node', () => {
	new NodeTestHarness().setupTests();

	it('preserves JSON field order and detaches input references when sorting items in simple mode', async () => {
		const inputData: INodeExecutionData[] = [
			{ json: { name: 'first', value: 1, id: 'a', createdAt: '2026-01-01' } },
			{ json: { name: 'second', value: 3, id: 'b', createdAt: '2026-01-02' } },
			{ json: { name: 'third', value: 2, id: 'c', createdAt: '2026-01-03' } },
		];

		const executeFunctions = {
			getInputData: vi.fn().mockReturnValue(inputData),
			getNodeParameter: vi.fn((parameterName: string) => {
				if (parameterName === 'type') return 'simple';
				if (parameterName === 'options.disableDotNotation') return false;
				if (parameterName === 'sortFieldsUi') {
					return {
						sortField: [{ fieldName: 'value', order: 'descending' }],
					};
				}

				return undefined;
			}),
			getNode: vi.fn().mockReturnValue({
				name: 'Sort',
				type: 'n8n-nodes-base.sort',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
		} as unknown as IExecuteFunctions;

		const result = await new Sort().execute.call(executeFunctions);
		const outputData = result[0];

		expect(outputData.map((item) => item.json.name)).toEqual(['second', 'third', 'first']);
		expect(outputData[0].json).not.toBe(inputData[1].json);
		expect(outputData[1].json).not.toBe(inputData[2].json);
		expect(outputData[2].json).not.toBe(inputData[0].json);
		expect(outputData.map((item) => Object.keys(item.json))).toEqual([
			['name', 'value', 'id', 'createdAt'],
			['name', 'value', 'id', 'createdAt'],
			['name', 'value', 'id', 'createdAt'],
		]);
	});
});
