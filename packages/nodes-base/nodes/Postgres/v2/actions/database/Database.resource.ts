import { READ_ONLY_ANNOTATIONS, type INodeProperties } from 'n8n-workflow';

import * as deleteTable from './deleteTable.operation';
import * as executeQuery from './executeQuery.operation';
import * as insert from './insert.operation';
import * as listSchemas from './listSchemas.operation';
import * as listTables from './listTables.operation';
import * as select from './select.operation';
import * as update from './update.operation';
import * as upsert from './upsert.operation';
import { schemaRLC, tableRLC } from '../common.descriptions';

export { deleteTable, executeQuery, insert, listSchemas, listTables, select, update, upsert };

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
				annotations: { effect: 'write', destructive: true },
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
				annotations: { effect: 'write', destructive: false, idempotent: false },
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-upsert
				name: 'Insert or Update',
				value: 'upsert',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-upsert
				description: 'Insert or update rows in a table',
				action: 'Insert or update rows in a table',
				annotations: { effect: 'write', destructive: true, idempotent: false },
			},
			{
				name: 'List Schemas',
				value: 'listSchemas',
				description: 'List the schemas this connection can see',
				action: 'List schemas',
				annotations: READ_ONLY_ANNOTATIONS,
			},
			{
				name: 'List Tables',
				value: 'listTables',
				description: 'List the tables in a schema',
				action: 'List tables in a schema',
				annotations: READ_ONLY_ANNOTATIONS,
			},
			{
				name: 'Select',
				value: 'select',
				description: 'Select rows from a table',
				action: 'Select rows from a table',
				annotations: READ_ONLY_ANNOTATIONS,
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update rows in a table',
				action: 'Update rows in a table',
				annotations: { effect: 'write', destructive: true, idempotent: true },
			},
		],
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
		default: 'insert',
	},
	{ ...schemaRLC, displayOptions: { hide: { operation: ['executeQuery', 'listSchemas'] } } },
	{
		...tableRLC,
		displayOptions: { hide: { operation: ['executeQuery', 'listSchemas', 'listTables'] } },
	},
	...deleteTable.description,
	...executeQuery.description,
	...insert.description,
	...listSchemas.description,
	...listTables.description,
	...select.description,
	...update.description,
	...upsert.description,
];
