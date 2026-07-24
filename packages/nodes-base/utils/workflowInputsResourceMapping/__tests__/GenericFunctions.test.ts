import { mock } from 'vitest-mock-extended';
import type {
	ILocalLoadOptionsFunctions,
	INode,
	ISupplyDataFunctions,
	IWorkflowNodeContext,
	NodeParameterValueType,
} from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { getWorkflowInputValues, loadWorkflowInputMappings } from '../GenericFunctions';

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

describe('loadWorkflowInputMappings', () => {
	const localLoadOptions = mock<ILocalLoadOptionsFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should load fields from the sub-workflow draft, without preferring the active version', async () => {
		const nodeContext = mock<IWorkflowNodeContext>();
		nodeContext.getNodeParameter.mockImplementation(
			(
				parameterName: string,
				_itemIndex: number,
				fallbackValue?: NodeParameterValueType,
			): NodeParameterValueType => {
				const parameters: Record<string, NodeParameterValueType> = {
					inputSource: 'workflowInputs',
					'workflowInputs.values': [
						{ name: 'Tipo de reporte', type: 'string' },
						{ name: 'existingInput', type: 'any' },
					],
				};
				return parameters[parameterName] ?? fallbackValue;
			},
		);
		nodeContext.getWorkflow.mockReturnValue({ id: 'sub-workflow-id', name: 'Sub', active: false });
		nodeContext.getNode.mockReturnValue(mock<INode>({ id: 'trigger-id' }));
		localLoadOptions.getWorkflowNodeContext.mockResolvedValue(nodeContext);

		const result = await loadWorkflowInputMappings.call(localLoadOptions);

		expect(localLoadOptions.getWorkflowNodeContext).toHaveBeenCalledWith(
			EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
		);
		expect(result).toEqual({
			dataMode: 'workflowInputs',
			subworkflowInfo: { workflowId: 'sub-workflow-id', triggerId: 'trigger-id' },
			fields: [
				{
					id: 'Tipo de reporte',
					displayName: 'Tipo de reporte',
					required: false,
					defaultMatch: false,
					display: true,
					canBeUsedToMatch: true,
					type: 'string',
				},
				{
					id: 'existingInput',
					displayName: 'existingInput',
					required: false,
					defaultMatch: false,
					display: true,
					canBeUsedToMatch: true,
				},
			],
		});
	});

	it('should default to passthrough when the sub-workflow has no trigger node', async () => {
		localLoadOptions.getWorkflowNodeContext.mockResolvedValue(null);

		const result = await loadWorkflowInputMappings.call(localLoadOptions);

		expect(result).toEqual({ fields: [], dataMode: 'passthrough', subworkflowInfo: undefined });
	});
});
