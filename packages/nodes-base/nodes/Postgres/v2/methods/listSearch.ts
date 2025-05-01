import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { configurePostgres } from '../../transport';
import type { PostgresNodeCredentials } from '../helpers/interfaces';

export async function schemaSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');
	const options = { nodeVersion: this.getNode().typeVersion };

	const { db } = await configurePostgres.call(this, credentials, options);

	const response = await db.any('SELECT schema_name FROM information_schema.schemata');

	if (filter) {
		const filterLower = filter.toLowerCase();
		const results = [];

		for (const schema of response) {
			const schemaName = schema.schema_name as string;
			if (schemaName.toLowerCase().indexOf(filterLower) !== -1) {
				results.push({
					name: schemaName,
					value: schemaName,
				});
			}
		}

		return { results };
	}

	return {
		results: response.map((schema) => ({
			name: schema.schema_name as string,
			value: schema.schema_name as string,
		})),
	};
}
export async function tableSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');
	const options = { nodeVersion: this.getNode().typeVersion };

	const { db } = await configurePostgres.call(this, credentials, options);

	const schema = this.getNodeParameter('schema', 0, {
		extractValue: true,
	}) as string;

	const response = await db.any(
		'SELECT table_name FROM information_schema.tables WHERE table_schema=$1',
		[schema],
	);

	if (filter) {
		const filterLower = filter.toLowerCase();
		const results = [];

		for (const table of response) {
			const tableName = table.table_name as string;
			if (tableName.toLowerCase().indexOf(filterLower) !== -1) {
				results.push({
					name: tableName,
					value: tableName,
				});
			}
		}

		return { results };
	}

	return {
		results: response.map((table) => ({
			name: table.table_name as string,
			value: table.table_name as string,
		})),
	};
}
