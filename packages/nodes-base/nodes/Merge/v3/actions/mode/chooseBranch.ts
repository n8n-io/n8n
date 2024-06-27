import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { preparePairedItemDataArray, updateDisplayOptions } from '@utils/utilities';

import { numberInputsProperty } from '../../helpers/descriptions';

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
		type: 'options',
		default: 1,
		displayOptions: {
			show: {
				output: ['specifiedInput'],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		options: [
			{
				name: '1',
				value: 1,
			},
			{
				name: '2',
				value: 2,
			},
			{
				name: '3',
				value: 3,
			},
			{
				name: '4',
				value: 4,
			},
			{
				name: '5',
				value: 5,
			},
			{
				name: '6',
				value: 6,
			},
			{
				name: '7',
				value: 7,
			},
			{
				name: '8',
				value: 8,
			},
			{
				name: '9',
				value: 9,
			},
			{
				name: '10',
				value: 10,
			},
		],
		description: 'The number of the input to use data of',
	},
];

const displayOptions = {
	show: {
		operation: ['chooseBranch'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputsData: INodeExecutionData[][],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const chooseBranchMode = this.getNodeParameter('chooseBranchMode', 0) as string;

	if (chooseBranchMode === 'waitForAll') {
		const output = this.getNodeParameter('output', 0) as string;

		if (output === 'specifiedInput') {
			const useDataOfInput = this.getNodeParameter('useDataOfInput', 0) as number;
			if (useDataOfInput > inputsData.length) {
				throw new NodeOperationError(this.getNode(), `Input ${useDataOfInput} doesn't exist`, {
					description: `The node has only ${inputsData.length} inputs, so selecting input ${useDataOfInput} is not possible.`,
				});
			}

			const inputData = inputsData[parseInt(String(useDataOfInput)) - 1];

			returnData.push.apply(returnData, inputData);
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
