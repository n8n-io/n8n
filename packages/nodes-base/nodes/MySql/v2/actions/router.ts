import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-core';

import * as database from './database/Database.resource';
import type { MySQLType } from './node.type';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<MySQLType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const mysqlNodeData = {
		resource,
		operation,
	} as MySQLType;

	switch (mysqlNodeData.resource) {
		case 'database':
			returnData = await database[mysqlNodeData.operation].execute.call(this);
			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported!`,
			);
	}

	return this.prepareOutputData(returnData);
}
