import { NodeOperationError } from 'n8n-workflow';
import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import * as oracleDBTypes from 'oracledb';

import type { OracleDBNodeCredentials } from '../helpers/interfaces';
import { configureOracleDB } from '../transport';

export async function schemaSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<OracleDBNodeCredentials>('oracleDBApi');
	const options = { nodeVersion: this.getNode().typeVersion };

	const pool: oracleDBTypes.Pool = await configureOracleDB.call(this, credentials, options);

	let conn: oracleDBTypes.Connection | undefined;

	try {
		conn = await pool.getConnection();

		const response = await conn.execute<{ USERNAME: string }>(
			'SELECT username FROM all_users',
			[],
			{
				outFormat: oracleDBTypes.OUT_FORMAT_OBJECT,
			},
		);

		const results =
			response.rows?.map((schema) => ({
				name: schema.USERNAME,
				value: schema.USERNAME,
			})) ?? [];

		return { results };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Failed to fetch schemas: ${error.message}`);
	} finally {
		if (conn) {
			await conn.close(); // Ensure connection is closed
		}
	}
}

export async function tableSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<OracleDBNodeCredentials>('oracleDBApi');
	const options = { nodeVersion: this.getNode().typeVersion };

	const pool: oracleDBTypes.Pool = await configureOracleDB.call(this, credentials, options);

	let conn: oracleDBTypes.Connection | undefined;

	try {
		// Get the connection from the pool
		conn = await pool.getConnection();

		// Retrieve the schema parameter
		const schema = this.getNodeParameter('schema', 0, {
			extractValue: true,
		}) as string;

		// Execute the SQL query to fetch table names for the given schema
		const response = await conn.execute<{ TABLE_NAME: string }>(
			'SELECT table_name FROM all_tables WHERE owner = (:1)',
			[schema],
			{
				outFormat: oracleDBTypes.OUT_FORMAT_OBJECT, // Ensure that the response is in object format
			},
		);

		// Map through the response.rows and format them
		const results =
			response.rows?.map((table) => ({
				name: table.TABLE_NAME,
				value: table.TABLE_NAME,
			})) ?? []; // Handle the case where rows might be undefined or empty

		// Return the results in the required format
		return { results };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), `Failed to fetch tables: ${error.message}`);
	} finally {
		// Ensure the connection is always closed
		if (conn) {
			await conn.close();
		}
	}
}
