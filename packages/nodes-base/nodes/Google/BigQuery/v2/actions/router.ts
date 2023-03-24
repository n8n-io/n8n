import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { GoogleBigQuery } from './node.type';

import * as record from './database/Database.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const resource = this.getNodeParameter<GoogleBigQuery>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	let returnData: INodeExecutionData[] = [];

	const googleBigQuery = {
		resource,
		operation,
	} as GoogleBigQuery;

	switch (googleBigQuery.resource) {
		case 'database':
			returnData = await record[googleBigQuery.operation].execute.call(this);
			break;
		default:
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
	}

	return this.prepareOutputData(returnData);
}
