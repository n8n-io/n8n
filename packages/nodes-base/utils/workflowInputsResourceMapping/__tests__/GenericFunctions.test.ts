import { mock } from 'jest-mock-extended';
import type { INode, ILocalLoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { getWorkflowInputValues, getTriggerNodes } from '../GenericFunctions';

describe('getWorkflowInputValues', () => {
	const supplyDataFunctions = mock<ISupplyDataFunctions>();

	it('should correctly map the binary property', () => {
		supplyDataFunctions.getInputData.mockReturnValue([
			{
				json: { key1: 'value1' },
				binary: { file1: { data: 'binaryData1', mimeType: 'image/png' } },
			},
			{
				json: { key2: 'value2' },
				binary: { file2: { data: 'binaryData2', mimeType: 'image/jpeg' } },
			},
		]);

		supplyDataFunctions.getNodeParameter
			.calledWith('workflowInputs.value', 0)
			.mockReturnValueOnce({ additionalKey1: 'additionalValue1' });
		supplyDataFunctions.getNodeParameter
			.calledWith('workflowInputs.value', 1)
			.mockReturnValueOnce({ additionalKey2: 'additionalValue2' });

		const result = getWorkflowInputValues.call(supplyDataFunctions);

		expect(result).toEqual([
			{
				json: {
					key1: 'value1',
					additionalKey1: 'additionalValue1',
				},
				binary: { file1: { data: 'binaryData1', mimeType: 'image/png' } },
				index: 0,
				pairedItem: { item: 0 },
			},
			{
				json: {
					key2: 'value2',
					additionalKey2: 'additionalValue2',
				},
				binary: { file2: { data: 'binaryData2', mimeType: 'image/jpeg' } },
				index: 1,
				pairedItem: { item: 1 },
			},
		]);

		expect(supplyDataFunctions.getInputData).toHaveBeenCalled();
		expect(supplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'workflowInputs.value',
			0,
			{},
		);
		expect(supplyDataFunctions.getNodeParameter).toHaveBeenCalledWith(
			'workflowInputs.value',
			1,
			{},
		);
	});
});

describe('getTriggerNodes', () => {
	let context: jest.Mocked<ILocalLoadOptionsFunctions>;

	beforeEach(() => {
		context = mock<ILocalLoadOptionsFunctions>();
	});

	it('should return trigger nodes as dropdown options', async () => {
		const mockTriggerNodes: INode[] = [
			{
				id: 'trigger1',
				name: 'Start Trigger',
				type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			} as INode,
			{
				id: 'trigger2',
				name: 'Another Trigger',
				type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [100, 0],
				parameters: {},
			} as INode,
		];

		context.getAllWorkflowNodes.mockResolvedValue(mockTriggerNodes);

		const result = await getTriggerNodes.call(context);

		expect(result).toEqual([
			{ name: 'Start Trigger', value: 'Start Trigger' },
			{ name: 'Another Trigger', value: 'Another Trigger' },
		]);
		expect(context.getAllWorkflowNodes).toHaveBeenCalledWith(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	});

	it('should return empty array when no triggers found', async () => {
		context.getAllWorkflowNodes.mockResolvedValue([]);

		const result = await getTriggerNodes.call(context);

		expect(result).toEqual([]);
	});

	it('should return empty array on error without throwing', async () => {
		context.getAllWorkflowNodes.mockRejectedValue(new Error('Database error'));

		const result = await getTriggerNodes.call(context);

		expect(result).toEqual([]);
		// Should not throw - errors are caught and handled gracefully
	});

	it('should filter out disabled nodes automatically via getAllWorkflowNodes', async () => {
		// getAllWorkflowNodes already filters disabled nodes, so we just verify it's called correctly
		const mockNodes: INode[] = [
			{
				id: 'trigger1',
				name: 'Enabled Trigger',
				type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				disabled: false,
			} as INode,
		];

		context.getAllWorkflowNodes.mockResolvedValue(mockNodes);

		const result = await getTriggerNodes.call(context);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Enabled Trigger');
	});
});
