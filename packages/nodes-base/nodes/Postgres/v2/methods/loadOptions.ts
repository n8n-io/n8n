import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { configurePostgres } from '../helpers/utils';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { db, pgp } = await configurePostgres.call(this);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const table = this.getNodeParameter('table', 0, {
		extractValue: true,
	}) as string;

	try {
		const columns = await db.any(
			'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
			[schema, table],
		);

		pgp.end();

		return columns.map((column: IDataObject) => ({
			name: column.column_name as string,
			value: column.column_name as string,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
			description: `type: ${(column.data_type as string).toUpperCase()}, nullable: ${
				column.is_nullable as string
			}`,
		}));
	} catch (error) {
		pgp.end();

		throw error;
	}
}

export async function getColumnsWithoutColumnToMatchOn(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn') as string;
	const returnData = await getColumns.call(this);
	return returnData.filter((column) => column.value !== columnToMatchOn);
}
