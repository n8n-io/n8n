import { IExecuteFunctions } from 'n8n-core';

import { INodeExecutionData, NodeApiError } from 'n8n-workflow';

import * as customer from './customer';
import * as ticket from './ticket';
import * as contact from './contact';
import * as rmm from './rmm';

import { SyncroMsp } from './Interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operationResult: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter<SyncroMsp>('resource', i);
		let operation = this.getNodeParameter('operation', i);
		let responseData: INodeExecutionData[] = [];
		if (operation === 'del') {
			operation = 'delete';
		}

		const syncroMsp = {
			resource,
			operation,
		} as SyncroMsp;

		try {
			if (syncroMsp.resource === 'customer') {
				responseData = await customer[syncroMsp.operation].execute.call(this, i);
			} else if (syncroMsp.resource === 'ticket') {
				responseData = await ticket[syncroMsp.operation].execute.call(this, i);
			} else if (syncroMsp.resource === 'contact') {
				responseData = await contact[syncroMsp.operation].execute.call(this, i);
			} else if (syncroMsp.resource === 'rmm') {
				responseData = await rmm[syncroMsp.operation].execute.call(this, i);
			}

			const executionData = this.helpers.constructExecutionMetaData(responseData, {
				itemData: { item: i },
			});

			operationResult.push(...executionData);
		} catch (err) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: err.message }),
					{ itemData: { item: i } },
				);
				operationResult.push(...executionErrorData);
			} else {
				throw new NodeApiError(this.getNode(), err, { itemIndex: i });
			}
		}
	}

	return this.prepareOutputData(operationResult);
}
