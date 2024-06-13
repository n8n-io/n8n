import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type {
	PgpDatabase,
	PostgresNodeOptions,
	QueriesRunner,
	QueryWithValues,
} from '../../helpers/interfaces';

import { replaceEmptyStringsByNulls } from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';
import { getResolvables, updateDisplayOptions } from '@utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
		noDataExpression: false,
		required: true,
		description:
			"The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.",
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'PostgreSQL',
		},
		hint: 'Consider using query parameters to prevent SQL injection attacks. Add them in the options below',
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
	nodeOptions: PostgresNodeOptions,
	_db?: PgpDatabase,
): Promise<INodeExecutionData[]> {
	items = replaceEmptyStringsByNulls(items, nodeOptions.replaceEmptyStrings as boolean);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		let query = this.getNodeParameter('query', i) as string;

		for (const resolvable of getResolvables(query)) {
			query = query.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
		}

		let values: Array<IDataObject | string> = [];

		let queryReplacement = this.getNodeParameter('options.queryReplacement', i, '');

		if (typeof queryReplacement === 'number') {
			queryReplacement = String(queryReplacement);
		}

		if (typeof queryReplacement === 'string') {
			const node = this.getNode();

			const rawReplacements = (node.parameters.options as IDataObject)?.queryReplacement as string;

			if (rawReplacements) {
				const rawValues = rawReplacements
					.replace(/^=+/, '')
					.split(',')
					.filter((entry) => entry)
					.map((entry) => entry.trim());

				for (const rawValue of rawValues) {
					const resolvables = getResolvables(rawValue);

					if (resolvables.length) {
						for (const resolvable of resolvables) {
							values.push(this.evaluateExpression(`${resolvable}`, i) as IDataObject);
						}
					} else {
						values.push(rawValue);
					}
				}
			}
		} else {
			if (Array.isArray(queryReplacement)) {
				values = queryReplacement as IDataObject[];
			} else {
				throw new NodeOperationError(
					this.getNode(),
					'Query Parameters must be a string of comma-separated values or an array of values',
					{ itemIndex: i },
				);
			}
		}

		queries.push({ query, values });
	}

	return await runQueries(queries, items, nodeOptions);
}
