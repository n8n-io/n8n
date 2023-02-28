import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';

import type { PgpClient, PgpDatabase, QueryWithValues } from '../../helpers/interfaces';

import { runQueries } from '../../helpers/utils';

import { optionsCollection, outpurSelector, schemaRLC, tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	schemaRLC,
	tableRLC,
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMapInputData',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'defineBelow',
				description: 'Set the value for each destination column',
			},
		],
		default: 'defineBelow',
		description: 'Whether to insert the input data this node receives in the new row',
	},
	...outpurSelector,
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['upsert'],
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
		const schema = this.getNodeParameter('schema', i, undefined, {
			extractValue: true,
		}) as string;

		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;

		const _query = '';
		const _values: string[] = [schema, table];

		const dataMode = this.getNodeParameter('dataMode', i) as string;

		if (dataMode === 'autoMapInputData') {
		}

		const output = this.getNodeParameter('output', 0) as string;

		let _outputColumns = '*';
		if (output === 'columns') {
			_outputColumns = (this.getNodeParameter('returnColumns', 0, []) as string[]).join(', ');
		}
	}

	return runQueries.call(this, pgp, db, queries, items, options);
}
