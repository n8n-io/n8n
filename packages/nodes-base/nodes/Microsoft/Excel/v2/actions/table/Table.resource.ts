import type { INodeProperties } from 'n8n-workflow';

import * as append from './append.operation';
import * as addTable from './addTable.operation';
import * as convertToRange from './convertToRange.operation';
import * as deleteTable from './deleteTable.operation';
import * as getColumns from './getColumns.operation';
import * as getRows from './getRows.operation';
import * as lookup from './lookup.operation';

export { append, addTable, convertToRange, deleteTable, getColumns, getRows, lookup };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['table'],
			},
		},
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Add rows to the end of the table',
				action: 'Append rows to table',
			},
			{
				name: 'Convert to Range',
				value: 'convertToRange',
				description: 'Convert a table to a range',
				action: 'Convert to range',
			},
			{
				name: 'Create',
				value: 'addTable',
				description: 'Add a table based on range',
				action: 'Create a table',
			},
			{
				name: 'Delete',
				value: 'deleteTable',
				description: 'Delete a table',
				action: 'Delete a table',
			},
			{
				name: 'Get Columns',
				value: 'getColumns',
				description: 'Retrieve a list of table columns',
				action: 'Get columns',
			},
			{
				name: 'Get Rows',
				value: 'getRows',
				description: 'Retrieve a list of table rows',
				action: 'Get rows',
			},
			{
				name: 'Lookup',
				value: 'lookup',
				description: 'Look for rows that match a given value in a column',
				action: 'Lookup a column',
			},
		],
		default: 'append',
	},
	...append.description,
	...addTable.description,
	...convertToRange.description,
	...deleteTable.description,
	...getColumns.description,
	...getRows.description,
	...lookup.description,
];
