import type { IExecuteFunctions } from 'n8n-workflow';
import type { MergeType } from './node.type';
import * as mode from './mode';

export async function router(this: IExecuteFunctions) {
	const operation = this.getNodeParameter('mode', 0) as MergeType;

	const returnData = await mode[operation].execute.call(this);

	return [returnData];
}
