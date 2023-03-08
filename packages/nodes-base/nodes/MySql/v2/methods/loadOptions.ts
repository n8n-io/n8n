import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { createConnection } from '../transport';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials);

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	try {
		const columns = (
			await connection.query(
				`SHOW COLUMNS FROM \`${table}\` FROM \`${credentials.database as string}\``,
			)
		)[0] as IDataObject[];

		await connection.end();

		return (columns || []).map((column: IDataObject) => ({
			name: column.Field as string,
			value: column.Field as string,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
			description: `type: ${(column.Type as string).toUpperCase()}, nullable: ${
				column.Null as string
			}`,
		}));
	} catch (error) {
		await connection.end();
		throw error;
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
