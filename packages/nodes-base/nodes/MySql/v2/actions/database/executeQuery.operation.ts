import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import type { Mysql2Pool, QueryWithValues } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import {
	prepareQueryAndReplacements,
	replaceEmptyStringsByNulls,
	runQueries,
} from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'SELECT id, name FROM product WHERE id < 40',
		required: true,
		description: 'The SQL query to execute',
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
	pool: Mysql2Pool,
	nodeOptions: IDataObject,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = replaceEmptyStringsByNulls(
		this.getInputData(),
		nodeOptions.replaceEmptyStrings as boolean,
	);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const rawQuery = this.getNodeParameter('query', i) as string;

		const options = this.getNodeParameter('options', i, {});

		let values = (options.queryReplacement as IDataObject)?.values as IDataObject[];

		if (values) {
			values = values.map((entry) => entry.value as IDataObject);
		}

		const preparedQuery = prepareQueryAndReplacements(rawQuery, values);

		queries.push(preparedQuery);
	}

	returnData = await runQueries.call(this, queries, nodeOptions, pool);

	return returnData;
}
