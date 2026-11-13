import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { configurePostgres } from '../../transport';
import type { PostgresNodeCredentials } from '../helpers/interfaces';
import { LIST_SCHEMAS_QUERY, LIST_TABLES_QUERY } from '../helpers/queries';
import { parseParameterLoadingError } from '../helpers/utils';

export async function schemaSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	try {
		const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');
		const options = { nodeVersion: this.getNode().typeVersion };

		const { db } = await configurePostgres.call(this, credentials, options);

		const response = await db.any(LIST_SCHEMAS_QUERY);

		return {
			results: response.map((schema) => ({
				name: schema.schema_name as string,
				value: schema.schema_name as string,
			})),
		};
	} catch (error) {
		throw parseParameterLoadingError(this.getNode(), error);
	}
}

export async function tableSearch(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	try {
		const credentials = await this.getCredentials<PostgresNodeCredentials>('postgres');
		const options = { nodeVersion: this.getNode().typeVersion };

		const { db } = await configurePostgres.call(this, credentials, options);

		const schema = this.getNodeParameter('schema', 0, {
			extractValue: true,
		}) as string;

		const response = await db.any(LIST_TABLES_QUERY, [schema]);

		return {
			results: response.map((table) => ({
				name: table.table_name as string,
				value: table.table_name as string,
			})),
		};
	} catch (error) {
		throw parseParameterLoadingError(this.getNode(), error);
	}
}
