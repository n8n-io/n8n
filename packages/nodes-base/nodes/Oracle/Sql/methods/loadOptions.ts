import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import type * as oracleDBTypes from 'oracledb';

import type { OracleDBNodeCredentials } from '../helpers/interfaces';
import { getColumnMetaData } from '../helpers/utils';
import { configureOracleDB } from '../transport';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<OracleDBNodeCredentials>('oracleDBApi');
	const options = { nodeVersion: this.getNode().typeVersion };

	const pool: oracleDBTypes.Pool = await configureOracleDB.call(this, credentials, options);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	const columns = await getColumnMetaData(this.getNode(), pool, schema, table);

	return columns.map((column) => ({
		name: column.columnName,
		value: column.columnName,
		description: `Type: ${column.dataType.toUpperCase()}, Nullable: ${column.isNullable}`,
	}));
}

export async function getColumnsMultiOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getColumns.call(this);
	const returnAll = { name: '*', value: '*', description: 'All columns' };
	return [returnAll, ...returnData];
}
