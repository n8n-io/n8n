import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { createConnection } from '../transport';

export async function searchTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials);

	const query = 'SELECT table_name FROM information_schema.tables WHERE table_schema = ?';
	const values = [credentials.database as string];

	const formatedQuery = connection.format(query, values);

	const response = (await connection.query(formatedQuery))[0];

	const results = (response as IDataObject[]).map((table) => ({
		name: table.table_name as string,
		value: table.table_name as string,
	}));

	await connection.end();

	return { results };
}
