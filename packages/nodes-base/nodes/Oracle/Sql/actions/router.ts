import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type oracledb from 'oracledb';

import * as database from './database/Database.resource';
import type { OracleDBType } from './node.type';
import { isOracleDBOperation } from './node.type';
import type { OracleDBNodeCredentials, OracleDBNodeOptions } from '../helpers/interfaces';
import { configureQueryRunner, prepareErrorItem } from '../helpers/utils';
import { configureOracleDB } from '../transport';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter<OracleDBType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	if (!isOracleDBOperation(operation)) {
		throw new NodeOperationError(
			this.getNode(),
			`The operation "${operation}" is not a valid value!`,
		);
	}

	const credentials = await this.getCredentials<OracleDBNodeCredentials>('oracleDBApi');
	const options = this.getNodeParameter('options', 0, {}) as OracleDBNodeOptions;
	const node = this.getNode();
	options.nodeVersion = node.typeVersion;
	options.operation = operation;
	options.autoCommit = options.autoCommit ?? true;

	const continueOnFail = this.continueOnFail();

	let pool: oracledb.Pool;
	try {
		pool = await configureOracleDB.call(this, credentials, options);
	} catch (error) {
		if (!continueOnFail) throw error;

		const errorItems =
			items.length > 0
				? items.map((_item, index) => prepareErrorItem(error as Error, index))
				: [prepareErrorItem(error as Error, 0)];

		return [errorItems];
	}

	const runQueries = configureQueryRunner.call(this, node, continueOnFail, pool);

	const oracleDBNodeData: OracleDBType = {
		resource,
		operation,
	};

	switch (oracleDBNodeData.resource) {
		case 'database':
			returnData = await database[oracleDBNodeData.operation].execute.call(
				this,
				runQueries,
				items,
				options,
				pool,
			);
			break;
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported!`,
			);
	}

	if (operation === 'select' && items.length > 1 && !node.executeOnce) {
		this.addExecutionHints({
			message: `This node ran ${items.length} times, once for each input item. To run for the first item only, enable 'execute once' in the node settings`,
			location: 'outputPane',
		});
	}

	return [returnData];
}
