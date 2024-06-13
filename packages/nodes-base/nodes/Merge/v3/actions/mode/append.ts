import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { numberInputsProperty } from '../../helpers/descriptions';

export const properties: INodeProperties[] = [numberInputsProperty];

const displayOptions = {
	show: {
		mode: ['append'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const inputs = NodeHelpers.getConnectionTypes(this.getNodeInputs()).filter(
		(type) => type === NodeConnectionType.Main,
	);

	for (let i = 0; i < inputs.length; i++) {
		returnData.push.apply(returnData, this.getInputData(i));
	}

	return returnData;
}
