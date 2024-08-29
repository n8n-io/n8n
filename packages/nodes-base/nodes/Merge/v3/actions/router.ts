import { NodeExecutionOutput, type IExecuteFunctions } from 'n8n-workflow';
import { getNodeInputsData } from '../helpers/utils';
import type { MergeType } from './node.type';
import * as mode from './mode';

export async function router(this: IExecuteFunctions) {
	const inputsData = getNodeInputsData.call(this);
	let operationMode = this.getNodeParameter('mode', 0) as string;

	if (operationMode === 'combine') {
		const combineBy = this.getNodeParameter('combineBy', 0) as string;
		operationMode = combineBy;
	}

	const returnData = await mode[operationMode as MergeType].execute.call(this, inputsData);

	if (returnData instanceof NodeExecutionOutput) {
		return returnData;
	} else {
		return [returnData];
	}
}
