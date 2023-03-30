import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { PostgresType } from './node.type';

import * as database from './database/Database.resource';
import { Connections } from '../transport';
import { configureQueryRunner } from '../helpers/utils';
import type { ConnectionsData } from '../helpers/interfaces';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<PostgresType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const credentials = await this.getCredentials('postgres');
	const options = this.getNodeParameter('options', 0, {});

	const { db, pgp, sshClient } = (await Connections.getInstance(
		credentials,
		options,
		true,
	)) as ConnectionsData;

	const runQueries = configureQueryRunner(
		this.getNode(),
		this.helpers.constructExecutionMetaData,
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
		pgp.end();
	}

	return this.prepareOutputData(returnData);
}
