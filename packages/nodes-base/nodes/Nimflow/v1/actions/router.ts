import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	NodeApiError,
} from 'n8n-workflow';

import * as context from './context';
import * as task from './task';
import * as fn from './function';
import { Nimflow } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<Nimflow>('resource', i);
		const operation = this.getNodeParameter('operation', i);

		const nimflow = {
			resource,
			operation,
		} as Nimflow;

		try {
			if (nimflow.resource === 'context') {
				operationResult.push(...await context[nimflow.operation].execute.call(this, i));
			} else if(nimflow.resource === 'task') {
				operationResult.push(...await task[nimflow.operation].execute.call(this, i));
			} else if(nimflow.resource === 'function') {
				operationResult.push(...await fn[nimflow.operation].execute.call(this, i));
			}
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({json: this.getInputData(i)[0].json, error: err});
			} else {
				if (err.context) err.context.itemIndex = i;
				throw new NodeApiError(this.getNode(), err);
			}
		}
	}

	return [operationResult];
}
