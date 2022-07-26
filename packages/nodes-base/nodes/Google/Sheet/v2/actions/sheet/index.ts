import * as append from './append';
import * as clear from './clear';
import * as create from './create';
import * as del from './del';
import * as lookup from './lookup';
import * as read from './read';
import * as remove from './remove';
import * as update from './update';
import * as upsert from './upsert';

import { INodeProperties } from 'n8n-workflow';

export {
	append,
	clear,
	create,
	del as delete,
	lookup,
	read,
	remove,
	update,
	upsert,
};


export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
			},
		},
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Append data to a sheet',
				action: 'Append data to a sheet',
			},
			{
				name: 'Clear',
				value: 'clear',
				description: 'Clear data from a sheet',
				action: 'Clear a sheet',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new sheet',
				action: 'Create a sheet',
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				action: 'Create or update a sheet',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete columns and rows from a sheet',
				action: 'Delete a sheet',
			},
			{
				name: 'Lookup',
				value: 'lookup',
				description: 'Look up a specific column value and return the matching row',
				action: 'Look up a column value in a sheet',
			},
			{
				name: 'Read',
				value: 'read',
				description: 'Read data from a sheet',
				action: 'Read a sheet',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a sheet',
				action: 'Remove a sheet',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update rows in a sheet',
				action: 'Update a sheet',
			},
		],
		default: 'read',
	},
	// This applies to all
	{
		displayName: 'Spreadsheet ID',
		name: 'sheetId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'sheet',
				],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the Google Spreadsheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.',
	},
	...append.description,
	...clear.description,
	...create.description,
	...del.description,
	...lookup.description,
	...read.description,
	...remove.description,
	...update.description,
	...upsert.description,
];

