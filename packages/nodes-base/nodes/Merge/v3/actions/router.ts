import type { IExecuteFunctions } from 'n8n-workflow';

import * as mode from './mode';
import type { MergeType } from './node.type';
import { getNodeInputsData } from '../helpers/utils';

export async function router(this: IExecuteFunctions) {
	const inputsData = getNodeInputsData.call(this);
	let operationMode = this.getNodeParameter('mode', 0) as string;

	if (operationMode === 'combine') {
		const combineBy = this.getNodeParameter('combineBy', 0) as string;
		operationMode = combineBy;
	}

	return await mode[operationMode as MergeType].execute.call(this, inputsData);
}
