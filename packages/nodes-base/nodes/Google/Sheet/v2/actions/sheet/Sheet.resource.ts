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
import { untilSheetSelected } from '../../helpers/GoogleSheets.utils';

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
				description: 'Append a new row or update the current one if it already exists (upsert)',
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
		displayName: 'Document',
		name: 'documentId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'spreadSheetsSearch',
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				extractValue: {
					type: 'regex',
					regex:
						'https:\\/\\/(?:drive|docs)\\.google\\.com\\/\\w+\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'https:\\/\\/(?:drive|docs)\\.google.com\\/\\w+\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
							errorMessage: 'Not a valid Google Drive File URL',
						},
					},
				],
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9\\-_]{2,}',
							errorMessage: 'Not a valid Google Drive File ID',
						},
					},
				],
				url: '=https://docs.google.com/spreadsheets/d/{{$value}}/edit',
			},
		],
		displayOptions: {
			show: {
				resource: ['sheet'],
			},
		},
	},
	{
		displayName: 'Sheet Name or ID',
		name: 'sheetName',
		type: 'options',
		default: '',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description: 'Google Sheet to operate on. Choose from the list.',
		typeOptions: {
			loadOptionsDependsOn: ['documentId.value'],
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
			// hide: {
			// 	...untilSheetSelected,
			// },
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
