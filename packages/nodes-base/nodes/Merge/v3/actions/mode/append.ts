import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { numberInputsProperty } from '../../helpers/descriptions';
import { getMergeNodeInputs } from '../../helpers/utils';

export const properties: INodeProperties[] = [numberInputsProperty];

const displayOptions = {
	show: {
		operation: ['append'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const inputs = getMergeNodeInputs(this);

	for (let i = 0; i < inputs.length; i++) {
		returnData.push.apply(returnData, this.getInputData(i));
	}

	return returnData;
}
