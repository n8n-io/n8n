import { NodeExecutionOutput, type IExecuteFunctions } from 'n8n-workflow';
import type { MergeType } from './node.type';
import * as mode from './mode';
import { getNodeInputsData } from '../helpers/utils';

export async function router(this: IExecuteFunctions) {
	const inputsData = getNodeInputsData.call(this);
	let operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'combine') {
		const combineBy = this.getNodeParameter('combineBy', 0) as string;
		operation = combineBy;
	}

	const returnData = await mode[operation as MergeType].execute.call(this, inputsData);

	if (returnData instanceof NodeExecutionOutput) {
		return returnData;
	} else {
		return [returnData];
	}
}
