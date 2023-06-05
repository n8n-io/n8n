import type { INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions } from 'n8n-core';

import { Client } from 'ssh2';

import type { MySqlType } from './node.type';
import type { QueryRunner } from '../helpers/interfaces';

import * as database from './database/Database.resource';

import { createPool } from '../transport';
import { configureQueryRunner } from '../helpers/utils';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<MySqlType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	const nodeOptions = this.getNodeParameter('options', 0);

	nodeOptions.nodeVersion = this.getNode().typeVersion;

	const credentials = await this.getCredentials('mySql');

	let sshClient: Client | undefined = undefined;

	if (credentials.sshTunnel) {
		sshClient = new Client();
	}
	const pool = await createPool(credentials, nodeOptions, sshClient);

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
	} catch (error) {
		throw error;
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		await pool.end();
	}

	return this.prepareOutputData(returnData);
}
