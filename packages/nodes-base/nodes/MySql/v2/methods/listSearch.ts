import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { createPool } from '../transport';

import { Client } from 'ssh2';

export async function searchTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials('mySql');

	const nodeOptions = this.getNodeParameter('options', 0) as IDataObject;

	let sshClient: Client | undefined = undefined;

	if (credentials.sshTunnel) {
		sshClient = new Client();
	}
	const pool = await createPool(credentials, nodeOptions, sshClient);

	try {
		const connection = await pool.getConnection();

		const query = 'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = ?';
		const values = [credentials.database as string];

		const formatedQuery = connection.format(query, values);

		const response = (await connection.query(formatedQuery))[0];

		connection.release();

		const results = (response as IDataObject[]).map((table) => ({
			name: (table.table_name as string) || (table.TABLE_NAME as string),
			value: (table.table_name as string) || (table.TABLE_NAME as string),
		}));

		return { results };
	} catch (error) {
		throw error;
	} finally {
		if (sshClient) {
			sshClient.end();
		}
		await pool.end();
	}
}
