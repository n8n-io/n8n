import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { getWorkflowInputValues } from '../GenericFunctions';

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
