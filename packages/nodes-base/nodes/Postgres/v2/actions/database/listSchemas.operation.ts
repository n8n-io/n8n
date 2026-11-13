import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type {
	PgpDatabase,
	PostgresNodeOptions,
	QueriesRunner,
	QueryWithValues,
} from '../../helpers/interfaces';
import { LIST_SCHEMAS_QUERY } from '../../helpers/queries';

const properties: INodeProperties[] = [];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['listSchemas'],
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
	// One query for each input item, as every other operation does. Execute Once runs it one time.
	const queries: QueryWithValues[] = items.map(() => ({ query: LIST_SCHEMAS_QUERY }));

	return await runQueries(queries, nodeOptions);
}
