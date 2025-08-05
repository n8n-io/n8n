import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as database from './database/Database.resource';
import type { PostgresType } from './node.type';
import { addExecutionHints } from '../../../../utils/utilities';
import { configurePostgres } from '../../transport';
import type { PostgresNodeCredentials, PostgresNodeOptions } from '../helpers/interfaces';
import { configureQueryRunner } from '../helpers/utils';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<PostgresType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');
	const options = this.getNodeParameter('options', 0, {}) as PostgresNodeOptions;
	const node = this.getNode();
	options.nodeVersion = node.typeVersion;
	options.operation = operation;

	const { db, pgp } = await configurePostgres.call(this, credentials, options);

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

	switch (postgresNodeData.resource) {
		case 'database':
			returnData = await database[postgresNodeData.operation].execute.call(
				this,
				runQueries,
				items,
				options,
				db,
				pgp,
			);
			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported!`,
			);
	}

	addExecutionHints(this, node, items, operation, node.executeOnce);

	return [returnData];
}
