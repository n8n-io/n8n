import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { GoogleBigQuery } from './node.type';

import * as record from './record/Record.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const length = items.length;
	const resource = this.getNodeParameter<GoogleBigQuery>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const returnData: INodeExecutionData[] = [];
	let responseData;

	const googleBigQuery = {
		resource,
		operation,
	} as GoogleBigQuery;

	for (let i = 0; i < length; i++) {
		try {
			switch (googleBigQuery.resource) {
				case 'record':
					responseData = await record[googleBigQuery.operation].execute.call(this, i, items);
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
			}
			returnData.push(...responseData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return this.prepareOutputData(returnData);
}
