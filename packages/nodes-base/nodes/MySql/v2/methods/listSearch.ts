import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import type { Mysql2PoolConnection, MysqlNodeCredentials } from '../helpers/interfaces';
import { quoteSqlIdentifier } from '../helpers/utils';
import { createPool } from '../transport';

// A SHOW statement names its column after the database or the filter, so the value is read by position.
async function showNames(
	connection: Mysql2PoolConnection,
	statement: string,
	filter?: string,
): Promise<INodeListSearchResult> {
	const query = filter ? connection.format(`${statement} LIKE ?`, [`%${filter}%`]) : statement;
	const response = (await connection.query(query))[0];

	const results = (response as IDataObject[]).map((row) => {
		const name = Object.values(row)[0] as string;
		return { name, value: name };
	});

	return { results };
}

// A raw name with a dot or a backtick is split into parts when it is escaped, so it is returned quoted.
const tableOption = (name: string) => ({
	name,
	value: /[.`]/.test(name) ? quoteSqlIdentifier(name) : name,
});

export async function searchTables(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<MysqlNodeCredentials>('mySql');

	const nodeOptions = this.getNodeParameter('options', 0) as IDataObject;
	const database = this.getNodeParameter('database', '', { extractValue: true });

	const pool = await createPool.call(this, credentials, nodeOptions);

	try {
		const connection = await pool.getConnection();

		// Unlike INFORMATION_SCHEMA, SHOW TABLES FROM fails for a database the user cannot see.
		if (typeof database === 'string' && database) {
			const result = await showNames(
				connection,
				`SHOW TABLES FROM ${quoteSqlIdentifier(database)}`,
				filter,
			);
			connection.release();
			return { results: result.results.map(({ name }) => tableOption(name)) };
		}

		let query = 'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = ?';
		const values: string[] = [credentials.database];

		if (filter) {
			query += ' AND TABLE_NAME LIKE ?';
			values.push(`%${filter}%`);
		}

		const formatedQuery = connection.format(query, values);

		const response = (await connection.query(formatedQuery))[0];

		connection.release();

		const results = (response as IDataObject[]).map((table) =>
			tableOption((table.table_name as string) || (table.TABLE_NAME as string)),
		);

		return { results };
	} finally {
		await pool.end();
	}
}

export async function searchDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<MysqlNodeCredentials>('mySql');

	const nodeOptions = this.getNodeParameter('options', 0) as IDataObject;

	const pool = await createPool.call(this, credentials, nodeOptions);

	try {
		const connection = await pool.getConnection();
		const result = await showNames(connection, 'SHOW DATABASES', filter);
		connection.release();
		return result;
	} finally {
		await pool.end();
	}
}
