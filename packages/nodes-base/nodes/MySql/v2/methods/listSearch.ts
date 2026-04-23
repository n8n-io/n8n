import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import type { MysqlNodeCredentials } from '../helpers/interfaces';
import { createPool } from '../transport';

export async function searchTables(
	this: ILoadOptionsFunctions, 
	tableName?: string
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<MysqlNodeCredentials>('mySql');

	const nodeOptions = this.getNodeParameter('options', 0) as IDataObject;

	const pool = await createPool.call(this, credentials, nodeOptions);

	try {
		const connection = await pool.getConnection();

		const query = `SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = ?
AND table_name LIKE ?
ORDER  BY table_name`;

		const values = [credentials.database, `%${tableName ?? ''}%`];
		
		const formatedQuery = connection.format(query, values);

		const response = (await connection.query(formatedQuery))[0];

		connection.release();

		const results = (response as IDataObject[]).map((table) => ({
			name: (table.table_name as string) || (table.TABLE_NAME as string),
			value: (table.table_name as string) || (table.TABLE_NAME as string),
		}));

		return { results };
	} finally {
		await pool.end();
	}
}
