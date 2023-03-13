import type { INodeProperties } from 'n8n-workflow';
import { schemaRLC, tableRLC } from '../common.descriptions';

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
				name: 'Delete',
				value: 'deleteTable',
				description: 'Delete an entire table or rows in a table',
				action: 'Delete table or rows',
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
				description: 'Insert rows in a table',
				action: 'Insert rows in a table',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-upsert
				name: 'Insert or Update',
				value: 'upsert',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-upsert
				description: 'Insert or update rows in a table',
				action: 'Insert or update rows in a table',
			},
			{
				name: 'Select',
				value: 'select',
				description: 'Select rows from a table',
				action: 'Select rows from a table',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update rows in a table',
				action: 'Update rows in a table',
			},
		],
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
		default: 'insert',
	},
	{ ...schemaRLC, displayOptions: { hide: { operation: ['executeQuery'] } } },
	{ ...tableRLC, displayOptions: { hide: { operation: ['executeQuery'] } } },
	...deleteTable.description,
	...executeQuery.description,
	...insert.description,
	...select.description,
	...update.description,
	...upsert.description,
];
