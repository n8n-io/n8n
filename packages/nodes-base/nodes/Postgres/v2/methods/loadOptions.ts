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
			'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
			[schema, table],
		);

		pgp.end();

		return columns.map((column: IDataObject) => ({
			name: column.column_name as string,
			value: column.column_name as string,
		}));
	} catch (error) {
		pgp.end();

		throw error;
	}
}
