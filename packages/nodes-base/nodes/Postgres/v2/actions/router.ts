import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import pgPromise from 'pg-promise';

import { pgInsertV2, pgQueryV2, pgUpdate, wrapData } from '../helpers/utils';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const credentials = await this.getCredentials('postgres');
	const largeNumbersOutput = this.getNodeParameter(
		'additionalFields.largeNumbersOutput',
		0,
		'',
	) as string;

	const pgp = pgPromise();

	if (largeNumbersOutput === 'numbers') {
		pgp.pg.types.setTypeParser(20, (value: string) => {
			return parseInt(value, 10);
		});
		pgp.pg.types.setTypeParser(1700, (value: string) => {
			return parseFloat(value);
		});
	}

	const config: IDataObject = {
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
	};

	if (credentials.allowUnauthorizedCerts === true) {
		config.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		config.sslmode = (credentials.ssl as string) || 'disable';
	}

	const db = pgp(config);

	let returnItems: INodeExecutionData[] = [];

	const items = this.getInputData();
	const operation = this.getNodeParameter('operation', 0);

	if (operation === 'executeQuery') {
		const queryResult = await pgQueryV2.call(this, pgp, db, items);
		returnItems = queryResult as INodeExecutionData[];
	} else if (operation === 'insert') {
		const insertData = await pgInsertV2.call(this, pgp, db, items);

		returnItems = insertData as INodeExecutionData[];
	} else if (operation === 'update') {
		const updateItems = await pgUpdate(
			this.getNodeParameter,
			pgp,
			db,
			items,
			this.continueOnFail(),
		);

		returnItems = wrapData(updateItems);
	} else {
		pgp.end();
		throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
	}

	pgp.end();

	return this.prepareOutputData(returnItems);
}
