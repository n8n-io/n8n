import { NodeExecutionOutput, type IExecuteFunctions } from 'n8n-workflow';
import type { MergeType } from './node.type';
import * as mode from './mode';
import { getNodeInputsData } from '../helpers/utils';

export async function router(this: IExecuteFunctions) {
	const operation = this.getNodeParameter('operation', 0) as MergeType;
	const inputsData = getNodeInputsData.call(this);

	const returnData = await mode[operation].execute.call(this, inputsData);

	if (returnData instanceof NodeExecutionOutput) {
		return returnData;
	} else {
		return [returnData];
	}
}
