import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { createPool } from '../transport';
import type { MysqlNodeCredentials, QueryRunner } from '../helpers/interfaces';
import { configureQueryRunner } from '../helpers/utils';
import * as database from './database/Database.resource';
import type { MySqlType } from './node.type';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<MySqlType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	const nodeOptions = this.getNodeParameter('options', 0);

	nodeOptions.nodeVersion = this.getNode().typeVersion;

	const credentials = (await this.getCredentials('mySql')) as MysqlNodeCredentials;

	const pool = await createPool.call(this, credentials, nodeOptions);

	const runQueries: QueryRunner = configureQueryRunner.call(this, nodeOptions, pool);

	const mysqlNodeData = {
		resource,
		operation,
	} as MySqlType;

	try {
		switch (mysqlNodeData.resource) {
			case 'database':
				const items = this.getInputData();

				returnData = await database[mysqlNodeData.operation].execute.call(
					this,
					items,
					runQueries,
					nodeOptions,
				);
				break;
			default:
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
		}
	} finally {
		await pool.end();
	}

	return [returnData];
}
