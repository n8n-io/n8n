import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import type oracledb from 'oracledb';

import { getResolvables, updateDisplayOptions } from '@utils/utilities';

import type {
	ExecuteOpBindParam,
	OracleDBNodeOptions,
	QueriesRunner,
	QueryWithValues,
} from '../../helpers/interfaces';
import { getBindParameters } from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Statement',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. SELECT id, name FROM product WHERE quantity > :1 AND price <= :2',
		noDataExpression: true,
		required: true,
		description:
			"The SQL statement to execute. You can use n8n expressions and positional parameters like :1, :2, :3, or named parameters like :name, :ID, etc to refer to the 'Bind Variable Placeholder Values' set in options below.",
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'OracleDB',
		},
		hint: 'Consider using bind parameters to prevent SQL injection attacks. Add them in the options below',
	},
	...optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['execute'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Query execution function for this node.
 *
 * This method is called once for every execution of the node during a workflow run.
 * It receives input data from the previous node(s) and returns output data to the next node(s).
 *
 *
 * Returns:
 * - An array of `INodeExecutionData` objects containing JSON data and optionally binary data, PairedItem,...
 */
export async function execute(
	this: IExecuteFunctions,
	runQueries: QueriesRunner,
	items: INodeExecutionData[],
	nodeOptions: OracleDBNodeOptions,
	_pool?: oracledb.Pool,
): Promise<INodeExecutionData[]> {
	const queries: QueryWithValues[] = [];

	for (let index = 0; index < items.length; index++) {
		let query = this.getNodeParameter('query', index) as string;

		// Dynamically replaces placeholders ({{...}}) in SQL queries.
		// Ex: SELECT * FROM users WHERE name = '{{ $json["name"] }}'
		// to SELECT * FROM users WHERE name = 'Alice'
		for (const resolvable of getResolvables(query)) {
			query = query.replace(resolvable, this.evaluateExpression(resolvable, index) as string);
		}

		let values: any = [];

		// get list of param objects entered by user
		const parameterIDataObjectList =
			((this.getNodeParameter('options.params', index, {}) as IDataObject)
				.values as ExecuteOpBindParam[]) || [];
		if (parameterIDataObjectList.length) {
			const { updatedQuery, bindParameters } = getBindParameters(query, parameterIDataObjectList);
			query = updatedQuery;
			values = bindParameters;
		}

		queries.push({ query, values });
	}

	return await runQueries(queries, items, nodeOptions);
}
