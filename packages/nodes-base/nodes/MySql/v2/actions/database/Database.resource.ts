import type { INodeProperties } from 'n8n-workflow';

import * as executeQuery from './executeQuery.operation';
import * as insert from './insert.operation';
import * as update from './update.operation';

export { executeQuery, insert, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
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
				name: 'Update',
				value: 'update',
				description: 'Update rows in database',
				action: 'Update rows in database',
			},
		],
		default: 'insert',
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
	},

	...executeQuery.description,
	...insert.description,
	...update.description,
];
