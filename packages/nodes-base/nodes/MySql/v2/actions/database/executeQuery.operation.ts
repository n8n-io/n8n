import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { QueryRunner, QueryWithValues } from '../../helpers/interfaces';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import { prepareQueryAndReplacements, replaceEmptyStringsByNulls } from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'e.g. SELECT id, name FROM product WHERE id < 40',
		required: true,
		description:
			"The SQL query to execute. You can use n8n expressions and $1, $2, $3, etc to refer to the 'Query Parameters' set in options below.",
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'mysql',
		},
		hint: 'Prefer using query parameters over n8n expressions to avoid SQL injection attacks',
	},
	{
		displayName: `
		To use query parameters in your SQL query, reference them as $1, $2, $3, etc in the corresponding order. <a target="_blank" href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql/">More info</a>.
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
	inputItems: INodeExecutionData[],
	runQueries: QueryRunner,
	nodeOptions: IDataObject,
): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = replaceEmptyStringsByNulls(inputItems, nodeOptions.replaceEmptyStrings as boolean);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const rawQuery = this.getNodeParameter('query', i) as string;

		const options = this.getNodeParameter('options', i, {});

		let values;
		let queryReplacement = options.queryReplacement || [];

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

		const preparedQuery = prepareQueryAndReplacements(rawQuery, values);

		queries.push(preparedQuery);
	}

	returnData = await runQueries(queries);

	return returnData;
}
