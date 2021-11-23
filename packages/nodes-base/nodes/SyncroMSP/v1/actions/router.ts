import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import * as customer from './customer';
import { SyncroMsp } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<SyncroMsp>('resource', i);
		let operation = this.getNodeParameter('operation', i);
		if (operation === 'del') {
			operation = 'delete';
		} else if (operation === 'desactive') {
			operation = 'deactive';
		}

		const syncroMsp = {
			resource,
			operation,
		} as SyncroMsp;

		try {
			if (syncroMsp.resource === 'customer') {
				operationResult.push(...await customer[syncroMsp.operation].execute.call(this, i));
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
