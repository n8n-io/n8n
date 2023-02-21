import type { INodeProperties } from 'n8n-workflow';

import * as addRow from './addRow.operation';
import * as addTable from './addTable.operation';
import * as convertToRange from './convertToRange.operation';
import * as deleteTable from './deleteTable.operation';
import * as getColumns from './getColumns.operation';
import * as getRows from './getRows.operation';
import * as lookup from './lookup.operation';

export { addRow, addTable, convertToRange, deleteTable, getColumns, getRows, lookup };

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
				name: 'Add Row',
				value: 'addRow',
				description: 'Add rows to the end of the table',
				action: 'Add a row',
			},
			{
				name: 'Add Table',
				value: 'addTable',
				description: 'Add a table based on range',
				action: 'Add a table',
			},
			{
				name: 'Convert to Range',
				value: 'convertToRange',
				description: 'Convert a table to a range',
				action: 'Convert to range',
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
				description: 'Look for a specific column value and then returns the matching row',
				action: 'Look up a column',
			},
		],
		default: 'addRow',
	},
	...addRow.description,
	...addTable.description,
	...convertToRange.description,
	...deleteTable.description,
	...getColumns.description,
	...getRows.description,
	...lookup.description,
];
