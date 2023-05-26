import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { getTableSchema } from '../helpers/utils';
import { configurePostgres } from '../transport';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('postgres');
	const options = { nodeVersion: this.getNode().typeVersion };

	const { db, pgp, sshClient } = await configurePostgres(credentials, options);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	try {
		const columns = await getTableSchema(db, schema, table);

		return columns.map((column) => ({
			name: column.column_name,
			value: column.column_name,
			description: `Type: ${column.data_type.toUpperCase()}, Nullable: ${column.is_nullable}`,
		}));
	} catch (error) {
		throw error;
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		pgp.end();
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
