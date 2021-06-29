import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData, NodeApiError,
} from 'n8n-workflow';

import * as channel from './channel';
import * as message from './message';
import * as reaction from './reaction';
import * as user from './user';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter('resource', i) as string;
		const operation = this.getNodeParameter('operation', i) as string;
		
		try {
			if (resource === 'channel') {
				const operationName = operation === 'delete' ? 'del' : operation as 'addUser' | 'create' | 'del' | 'members' | 'restore' | 'statistics';
				operationResult.push(...await channel[operationName].call(this, i));
			} else if (resource === 'message') {
				const operationName = operation === 'delete' ? 'del' : operation as 'del' | 'post' | 'postEphemeral';
				operationResult.push(...await message[operationName].call(this, i));
			} else if (resource === 'reaction') {
				const operationName = operation === 'delete' ? 'del' : operation as 'create' | 'del' | 'getAll';
				operationResult.push(...await reaction[operationName].call(this, i));
			} else if (resource === 'user') {
				const operationName = operation === 'desactivate' ? 'deactivate' : operation as 'create' | 'deactivate' | 'getAll' | 'getById' | 'invite';
				operationResult.push(...await user[operationName].call(this, i));
			} else {
				throw new NodeApiError(this.getNode(), {message: 'Resource not supported.'});
			}
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push(err);
			} else {
				throw err;
			}
		}
	}

	return [operationResult];
}
