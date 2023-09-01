import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { PostgresType } from './node.type';

import * as database from './database/Database.resource';
import { configurePostgres } from '../transport';
import { configureQueryRunner } from '../helpers/utils';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<PostgresType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const credentials = await this.getCredentials('postgres');
	const options = this.getNodeParameter('options', 0, {});
	options.nodeVersion = this.getNode().typeVersion;
	options.operation = operation;

	const { db, pgp, sshClient } = await configurePostgres(credentials, options);

	const runQueries = configureQueryRunner.call(
		this,
		this.getNode(),
		this.continueOnFail(),
		pgp,
		db,
	);

	const postgresNodeData = {
		resource,
		operation,
	} as PostgresType;

	try {
		switch (postgresNodeData.resource) {
			case 'database':
				returnData = await database[postgresNodeData.operation].execute.call(
					this,
					runQueries,
					items,
					options,
					db,
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

		await db.$pool.end();
	}

	return this.prepareOutputData(returnData);
}
