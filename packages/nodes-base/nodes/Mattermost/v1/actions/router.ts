import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import * as channel from './channel';
import type { Mattermost } from './Interfaces';
import * as message from './message';
import * as reaction from './reaction';
import * as user from './user';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];
	let responseData: IDataObject | IDataObject[] = [];

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
				responseData = await channel[mattermost.operation].execute.call(this, i);
			} else if (mattermost.resource === 'message') {
				responseData = await message[mattermost.operation].execute.call(this, i);
			} else if (mattermost.resource === 'reaction') {
				responseData = await reaction[mattermost.operation].execute.call(this, i);
			} else if (mattermost.resource === 'user') {
				responseData = await user[mattermost.operation].execute.call(this, i);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);
			operationResult.push(...executionData);
		} catch (err) {
			if (this.continueOnFail()) {
				operationResult.push({ json: this.getInputData(i)[0].json, error: err });
			} else {
				if (err.context) err.context.itemIndex = i;
				throw err;
			}
		}
	}

	return [operationResult];
}
