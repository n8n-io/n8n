import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import * as user from './user';
import { Mattermost } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
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
	}

	return operationResult;
}
