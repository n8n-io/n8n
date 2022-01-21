import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import * as channel from './channel';
import * as message from './message';
import * as reaction from './reaction';
import * as user from './user';
import { Mattermost } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<Mattermost>('resource', i);
		let operation = this.getNodeParameter('operation', i);
		if (operation === 'del') {
			operation = 'delete';
		} else if (operation === 'desactive') {
			operation = 'deactive';
		}

		const mattermost = {
			resource,
			operation,
		} as Mattermost;

		try {
			if (mattermost.resource === 'channel') {
				operationResult.push(...await channel[mattermost.operation].execute.call(this, i));
			} else if (mattermost.resource === 'message') {
				operationResult.push(...await message[mattermost.operation].execute.call(this, i));
			} else if (mattermost.resource === 'reaction') {
				operationResult.push(...await reaction[mattermost.operation].execute.call(this, i));
			} else if (mattermost.resource === 'user') {
				operationResult.push(...await user[mattermost.operation].execute.call(this, i));
			}
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({json: this.getInputData(i)[0].json, error: err});
			} else {
				throw err;
			}
		}
	}

	return [operationResult];
}
