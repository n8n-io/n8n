import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import type { PgpClient, PgpDatabase, QueryWithValues } from '../../helpers/interfaces';

import { runQueries } from '../../helpers/utils';

import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'SELECT id, name FROM product WHERE quantity > $1 AND price <= $2',
		required: true,
		description:
			"The SQL query to execute. You can use n8n expressions or $1 and $2 in conjunction with 'Query Values Replacement'.",
	},
	{
		displayName: `
		You can use <strong>Query Values Replacement</strong> to map values in <strong>Query</strong>, to reference first value use $1,to reference second $2 and so on, if value is SQL name or identifier add :name or ~,<br/>
		e.g. SELECT * FROM $1:name WHERE id = $2;`,
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Query Values Replacement',
		name: 'queryReplacement',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		placeholder: 'Add Value',
		description:
			'Value has to be of type number, bigint, string, boolean, Date and null, types Array and Object will be converted to string',
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
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
	pgp: PgpClient,
	db: PgpDatabase,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', 0);

	const queries: QueryWithValues[] = [];

	for (let i = 0; i < items.length; i++) {
		const query = this.getNodeParameter('query', i) as string;
		const values = (this.getNodeParameter('queryReplacement.values', i, []) as IDataObject[]).map(
			(entry) => entry.value as string,
		);
		const queryFormat = { query, values };
		queries.push(queryFormat);
	}

	return runQueries.call(this, pgp, db, queries, items, options);
}
