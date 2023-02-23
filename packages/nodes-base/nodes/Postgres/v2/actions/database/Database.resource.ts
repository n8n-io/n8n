import type { INodeProperties } from 'n8n-workflow';

import * as deleteTable from './deleteTable.operation';
import * as executeQuery from './executeQuery.operation';
import * as insert from './insert.operation';
import * as select from './select.operation';
import * as update from './update.operation';
import * as upsert from './upsert.operation';

export { deleteTable, executeQuery, insert, select, update, upsert };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Delete Table',
				value: 'deleteTable',
				description: 'Delete table from database',
				action: 'Delete table from database',
			},
			{
				name: 'Execute Query',
				value: 'executeQuery',
				description: 'Execute an SQL query',
				action: 'Execute a SQL query',
			},
			{
				name: 'Insert',
				value: 'insert',
				description: 'Insert rows in database',
				action: 'Insert rows in database',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-upsert
				name: 'Insert or Update',
				value: 'upsert',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-upsert
				description: 'Insert or update rows in database',
				action: 'Insert or update rows in database',
			},
			{
				name: 'Select',
				value: 'select',
				description: 'Select data from database',
				action: 'Select data from database',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update rows in database',
				action: 'Update rows in database',
			},
		],
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
		default: 'insert',
	},
	...deleteTable.description,
	...executeQuery.description,
	...insert.description,
	...select.description,
	...update.description,
	...upsert.description,
];
