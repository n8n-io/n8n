import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	PgpDatabase,
	PostgresNodeOptions,
	QueriesRunner,
	QueryWithValues,
} from '../../helpers/interfaces';
import { LIST_TABLES_QUERY } from '../../helpers/queries';

const properties: INodeProperties[] = [];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['listTables'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: PostgresNodeOptions,
	_db?: PgpDatabase,
): Promise<INodeExecutionData[]> {
	const queries: QueryWithValues[] = items.map((_, index) => {
		const schema = this.getNodeParameter('schema', index, undefined, {
			extractValue: true,
		}) as string;

		return { query: LIST_TABLES_QUERY, values: [schema] };
	});

	return await runQueries(queries, nodeOptions);
}
