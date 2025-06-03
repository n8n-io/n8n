import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import type { MysqlNodeCredentials } from '../helpers/interfaces';
import { escapeSqlIdentifier } from '../helpers/utils';
import { createPool } from '../transport';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<MysqlNodeCredentials>('mySql');
	const nodeOptions = this.getNodeParameter('options', 0) as IDataObject;

	const pool = await createPool.call(this, credentials, nodeOptions);

	try {
		const connection = await pool.getConnection();

		const table = this.getNodeParameter('table', 0, {
			extractValue: true,
		}) as string;

		const columns = (
			await connection.query(
				`SHOW COLUMNS FROM ${escapeSqlIdentifier(table)} FROM ${escapeSqlIdentifier(
					credentials.database,
				)}`,
			)
		)[0] as IDataObject[];

		connection.release();

		return (columns || []).map((column: IDataObject) => ({
			name: column.Field as string,
			value: column.Field as string,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
			description: `type: ${(column.Type as string).toUpperCase()}, nullable: ${
				column.Null as string
			}`,
		}));
	} finally {
		await pool.end();
	}
}

export async function getColumnsMultiOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getColumns.call(this);
	const returnAll = { name: '*', value: '*', description: 'All columns' };
	return [returnAll, ...returnData];
}

export async function getColumnsWithoutColumnToMatchOn(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn') as string;
	const returnData = await getColumns.call(this);
	return returnData.filter((column) => column.value !== columnToMatchOn);
}
