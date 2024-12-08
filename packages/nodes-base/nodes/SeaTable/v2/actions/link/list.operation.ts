import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	updateDisplayOptions,
} from 'n8n-workflow';

import { seaTableApiRequest } from '../../GenericFunctions';

export const properties: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Select a table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNameAndId',
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Choose from the list, of specify by using an expression. Provide it in the way "table_name:::table_id".',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Link Column',
		name: 'linkColumn',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getLinkColumnsWithColumnKey',
		},
		required: true,
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Choose from the list of specify the Link Column by using an expression. You have to provide it in the way "column_name:::link_id:::other_table_id:::column_key".',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Row ID',
		name: 'rowId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getRowIds',
		},
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['link'],
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
	const linkColumn = this.getNodeParameter('linkColumn', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;

	// get rows
	const responseData = await seaTableApiRequest.call(
		this,
		{},
		'POST',
		'/dtable-db/api/v1/linked-records/{{dtable_uuid}}/',
		{
			table_id: tableName.split(':::')[1],
			link_column: linkColumn.split(':::')[3],
			rows: [
				{
					row_id: rowId,
					offset: 0,
					limit: 100,
				},
			],
		},
	);
	return this.helpers.returnJsonArray(responseData[rowId] as IDataObject[]);
}
