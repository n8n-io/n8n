import { INodeProperties } from 'n8n-workflow';
import * as append from './append.operation';
import * as appendOrUpdate from './appendOrUpdate.operation';
import * as clear from './clear.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as readMatchingRows from './readMatchingRows.operation';
import * as readAllRows from './readAllRows.operation';
import * as remove from './remove.operation';
import * as update from './update.operation';

export {
	append,
	appendOrUpdate,
	clear,
	create,
	del as delete,
	readAllRows,
	readMatchingRows,
	remove,
	update,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sheet'],
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
				// eslint-disable-next-line n8n-nodes-base/node-param-option-name-wrong-for-upsert
				name: 'Append or Update',
				value: 'appendOrUpdate',
				description: 'Append a new record, or update the current one if it already exists (upsert)',
				action: 'Append or update a sheet',
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
				name: 'Delete',
				value: 'delete',
				description: 'Delete columns and rows from a sheet',
				action: 'Delete a sheet',
			},
			{
				name: 'Read All Rows',
				value: 'readAllRows',
				description: 'Read all rows in a sheet',
				action: 'Read all rows',
			},
			{
				name: 'Read Matching Row(s)',
				value: 'readMatchingRows',
				description: 'Read rows that match a value',
				action: 'Read rows that match a value',
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
		default: 'readAllRows',
	},
	{
		displayName: 'Resource Locator',
		name: 'resourceLocator',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['sheet'],
			},
		},
		required: true,
		default: 'fromList',
		options: [
			{
				name: 'From List',
				value: 'fromList',
				description: 'Select from a pre-populated list',
			},
			{
				name: 'By ID',
				value: 'byId',
				description: 'Use the spreadsheet ID',
			},
			{
				name: 'By URL',
				value: 'byUrl',
				description: 'Use the spreadsheet URL',
			},
		],
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Document Name',
		name: 'spreadsheetName',
		type: 'options',
		default: '',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'Google Sheet to operate on. Choose from the list.',
		typeOptions: {
			loadOptionsMethod: 'getSheetIds',
		},
		displayOptions: {
			show: {
				resource: ['sheet'],
				resourceLocator: ['fromList'],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'spreadsheetId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sheet'],
				resourceLocator: ['byId'],
			},
		},
		default: '',
		required: true,
		description:
			'The ID of the Google Sheet. Found as part of the sheet URL https://docs.google.com/spreadsheets/d/{ID}/.',
	},
	{
		displayName: 'Document URL',
		name: 'spreadsheetUrl',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['sheet'],
				resourceLocator: ['byUrl'],
			},
		},
		default: '',
		required: true,
		description: 'The URL of the Google Sheet',
	},
	// getSheets
	{
		displayName: 'Sheet Name or ID',
		name: 'sheetName',
		type: 'options',
		default: '',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'Google Sheet to operate on. Choose from the list.',
		typeOptions: {
			loadOptionsDependsOn: ['spreadsheetName', 'spreadsheetUrl', 'spreadsheetId'],
			loadOptionsMethod: 'getSheets',
		},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: [
					'append',
					'appendOrUpdate',
					'clear',
					'delete',
					'readAllRows',
					'readMatchingRows',
					'remove',
					'update',
				],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
	},

	...append.description,
	...clear.description,
	...create.description,
	...del.description,
	...readMatchingRows.description,
	...readAllRows.description,
	...update.description,
	...appendOrUpdate.description,
];
