import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { preparePairedItemDataArray, updateDisplayOptions } from '@utils/utilities';

import { numberInputsProperty } from '../../helpers/descriptions';
import { getMergeNodeInputs } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	numberInputsProperty,
	{
		displayName: 'Output Type',
		name: 'chooseBranchMode',
		type: 'options',
		options: [
			{
				name: 'Wait for All Inputs to Arrive',
				value: 'waitForAll',
			},
		],
		default: 'waitForAll',
	},
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		options: [
			{
				name: 'Data of Specified Input',
				value: 'specifiedInput',
			},
			{
				name: 'A Single, Empty Item',
				value: 'empty',
			},
		],
		default: 'specifiedInput',
		displayOptions: {
			show: {
				chooseBranchMode: ['waitForAll'],
			},
		},
	},
	{
		displayName: 'Use Data of Input',
		name: 'useDataOfInput',
		type: 'number',
		default: 1,
		displayOptions: {
			show: {
				output: ['specifiedInput'],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		description: 'The number of the input to use data of',
	},
];

const displayOptions = {
	show: {
		operation: ['chooseBranch'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const inputs = getMergeNodeInputs(this);

	const chooseBranchMode = this.getNodeParameter('chooseBranchMode', 0) as string;

	if (chooseBranchMode === 'waitForAll') {
		const output = this.getNodeParameter('output', 0) as string;

		if (output === 'specifiedInput') {
			const useDataOfInput = this.getNodeParameter('useDataOfInput', 0) as number;
			if (useDataOfInput > inputs.length) {
				throw new NodeOperationError(
					this.getNode(),
					`The input ${useDataOfInput} is not allowed.`,
					{
						description: `The node has only ${inputs.length} inputs, so selecting input ${useDataOfInput} is not possible.`,
					},
				);
			}
			returnData.push.apply(returnData, this.getInputData(parseInt(String(useDataOfInput)) - 1));
		}
		if (output === 'empty') {
			const pairedItem = [
				...this.getInputData(0).map((inputData) => inputData.pairedItem),
				...this.getInputData(1).map((inputData) => inputData.pairedItem),
			].flatMap(preparePairedItemDataArray);

			returnData.push({
				json: {},
				pairedItem,
			});
		}
	}

	return returnData;
}
