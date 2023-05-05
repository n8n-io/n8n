import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import type { PgpDatabase, QueriesRunner, QueryWithValues } from '../../helpers/interfaces';

import { replaceEmptyStringsByNulls } from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
		required: true,
		description:
			"The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.",
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'postgres',
		},
		hint: 'Prefer using query parameters over n8n expressions to avoid SQL injection attacks',
	},
	{
		displayName: `
		To use query parameters in your SQL query, reference them as $1, $2, $3, etc in the corresponding order. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/#use-query-parameters">More info</a>.
		`,
		name: 'notice',
		type: 'notice',
		default: '',
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: IDataObject,
	_db?: PgpDatabase,
): Promise<INodeExecutionData[]> {
	items = replaceEmptyStringsByNulls(items, nodeOptions.replaceEmptyStrings as boolean);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const query = this.getNodeParameter('query', i) as string;

		let values: IDataObject[] = [];

		let queryReplacement = this.getNodeParameter('options.queryReplacement', i, '');

		if (typeof queryReplacement === 'string') {
			queryReplacement = queryReplacement.split(',').map((entry) => entry.trim());
		}

		if (Array.isArray(queryReplacement)) {
			values = queryReplacement as IDataObject[];
		} else {
			throw new NodeOperationError(
				this.getNode(),
				'Query Replacement must be a string of comma-separated values, or an array of values',
				{ itemIndex: i },
			);
		}

		queries.push({ query, values });
	}

	return runQueries(queries, items, nodeOptions);
}
