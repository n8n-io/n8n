import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import * as campaign from './campaign';
import * as userList from './userList';
import * as search from './search';
import { Ads } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<Ads>('resource', i);
		const operation = this.getNodeParameter('operation', i);

		const ads = {
			resource,
			operation,
		} as Ads;

		try {
			 if (ads.resource === 'campaign') {
				// @ts-ignore
				 operationResult.push(...await campaign[ads.operation].execute.call(this, i));
			} else if (ads.resource === 'userList') {
				// @ts-ignore
				 operationResult.push(...await userList[ads.operation].execute.call(this, i));
			} else if (ads.resource === 'search') {
				// @ts-ignore
				 operationResult.push(...await search[ads.operation].execute.call(this, i));
			}
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({json: this.getInputData(i)[0].json, error: err});
			} else {
				throw err;
			}
		}
	}

	return operationResult;
}
