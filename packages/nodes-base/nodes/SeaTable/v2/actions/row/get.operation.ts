import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	updateDisplayOptions,
} from 'n8n-workflow';

import {
	seaTableApiRequest,
	enrichColumns,
	simplify_new,
	getBaseCollaborators,
} from '../../GenericFunctions';
import type { IRowResponse, IDtableMetadataColumn } from '../Interfaces';

export const properties: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'Return Column Names',
				name: 'convert',
				type: 'boolean',
				default: true,
				description: 'Whether to return the column keys (false) or the column names (true)',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['row'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	// get parameters
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;
	const options = this.getNodeParameter('options', index);

	// get collaborators
	const collaborators = await getBaseCollaborators.call(this);

	// get rows
	const sqlResult = (await seaTableApiRequest.call(
		this,
		{},
		'POST',
		'/api-gateway/api/v2/dtables/{{dtable_uuid}}/sql/',
		{
			sql: `SELECT * FROM \`${tableName}\` WHERE _id = '${rowId}'`,
			convert_keys: options.convert ?? true,
		},
	)) as IRowResponse;
	const metadata = sqlResult.metadata as IDtableMetadataColumn[];
	const rows = sqlResult.results;

	// hide columns like button
	rows.map((row) => enrichColumns(row, metadata, collaborators));
	const simple = options.simple ?? true;
	// remove columns starting with _ if simple;
	if (simple) {
		rows.map((row) => simplify_new(row));
	}

	return this.helpers.returnJsonArray(rows as IDataObject[]);
}
