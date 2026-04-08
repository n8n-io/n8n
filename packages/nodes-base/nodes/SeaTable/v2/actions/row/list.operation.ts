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
import type { IRow } from '../Interfaces';

export const properties: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'View Name',
		name: 'viewName',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getTableViews',
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'The name of SeaTable view to access, or specify by using an expression. Provide it in the way "col.name:::col.type".',
	},
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
		operation: ['list'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	// get parameters
	const tableName = this.getNodeParameter('tableName', index) as string;
	const viewName = this.getNodeParameter('viewName', index) as string;
	const options = this.getNodeParameter('options', index);

	// get collaborators
	const collaborators = await getBaseCollaborators.call(this);

	// get rows
	const requestMeta = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/api-gateway/api/v2/dtables/{{dtable_uuid}}/metadata/',
	);

	const requestRows = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/api-gateway/api/v2/dtables/{{dtable_uuid}}/rows/',
		{},
		{
			table_name: tableName,
			view_name: viewName,
			limit: 1000,
			convert_keys: options.convert ?? true,
		},
	);

	const metadata =
		requestMeta.metadata.tables.find((table: { name: string }) => table.name === tableName)
			?.columns ?? [];
	const rows = requestRows.rows as IRow[];

	// hide columns like button
	rows.map((row) => enrichColumns(row, metadata, collaborators));

	const simple = options.simple ?? true;
	// remove columns starting with _ if simple;
	if (simple) {
		rows.map((row) => simplify_new(row));
	}

	return this.helpers.returnJsonArray(rows as IDataObject[]);
}
