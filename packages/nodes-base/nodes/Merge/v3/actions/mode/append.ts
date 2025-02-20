import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { numberInputsProperty } from '../../helpers/descriptions';

export const properties: INodeProperties[] = [numberInputsProperty];

const displayOptions = {
	show: {
		mode: ['append'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputsData: INodeExecutionData[][],
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < inputsData.length; i++) {
		returnData.push.apply(returnData, inputsData[i]);
	}

	return [returnData];
}
