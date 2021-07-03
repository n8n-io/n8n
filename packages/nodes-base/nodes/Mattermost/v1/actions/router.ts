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
		let operation = this.getNodeParameter('operation', i) as string;
		if (operation === 'delete') {
			operation = 'del';
		} else if (operation === 'desactive') {
			operation = 'deactive';
		}
		const mattermost = {
			resource,
			operation,
		} as Mattermost;
		
		try {
			if (mattermost.resource === 'channel') {
				operationResult.push(...await channel[mattermost.operation].call(this, i));
			} else if (mattermost.resource === 'message') {
				operationResult.push(...await message[mattermost.operation].call(this, i));
			} else if (mattermost.resource === 'reaction') {
				operationResult.push(...await reaction[mattermost.operation].call(this, i));
			} else if (mattermost.resource === 'user') {
				operationResult.push(...await user[mattermost.operation].call(this, i));
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
