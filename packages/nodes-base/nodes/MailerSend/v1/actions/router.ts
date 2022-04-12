import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData, JsonObject, NodeApiError,
} from 'n8n-workflow';

import * as email from './email';
import * as bulkEmail from './bulkEmail';
import * as message from './message';
import { MailerSend } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<MailerSend>('resource', i);
		let operation = this.getNodeParameter('operation', i);
		if (operation === 'del') {
			operation = 'delete';
		} else if (operation === 'desactive') {
			operation = 'deactive';
		}

		const mailersend = {
			resource,
			operation,
		} as MailerSend;

		try {
			if (mailersend.resource === 'email') {
				operationResult.push(...await email[mailersend.operation].execute.call(this, i));
			} else if (mailersend.resource === 'bulkEmail') {
				if (i === 0) {
					operationResult.push(...await bulkEmail[mailersend.operation].execute.call(this, i));
				}
			} else if (mailersend.resource === 'message') {
				operationResult.push(...await message[mailersend.operation].execute.call(this, i));
			}
		} catch (err) {
			if (this.continueOnFail()) {
				// err should be of type NodeApiError | NodeOperationError
				operationResult.push({
					json: this.getInputData(i)[0].json,
					error: err as NodeApiError});
			} else {
				throw err;
			}
		}
	}

	return [operationResult];
}
