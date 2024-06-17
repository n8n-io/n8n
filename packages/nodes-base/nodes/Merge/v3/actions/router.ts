import { NodeExecutionOutput, type IExecuteFunctions } from 'n8n-workflow';
import type { MergeType } from './node.type';
import * as mode from './mode';

export async function router(this: IExecuteFunctions) {
	const operation = this.getNodeParameter('operation', 0) as MergeType;

	const returnData = await mode[operation].execute.call(this);

	if (returnData instanceof NodeExecutionOutput) {
		return returnData;
	} else {
		return [returnData];
	}
}
