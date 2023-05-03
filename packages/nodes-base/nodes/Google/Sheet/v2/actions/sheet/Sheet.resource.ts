import type { INodeProperties } from 'n8n-workflow';
import * as append from './append.operation';
import * as appendOrUpdate from './appendOrUpdate.operation';
import * as clear from './clear.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as read from './read.operation';
import * as remove from './remove.operation';
import * as update from './update.operation';

export { append, appendOrUpdate, clear, create, del as delete, read, remove, update };

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
				name: 'Read Rows',
				value: 'read',
				description: 'Read all rows in a sheet',
				action: 'Read all rows',
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
		displayName: 'Sheet',
		name: 'sheetName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		// default: '', //empty string set to progresivly reveal fields
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['documentId.value'],
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'sheetsSearch',
					searchable: false,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				extractValue: {
					type: 'regex',
					regex:
						'https:\\/\\/docs\\.google\\.com/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'https:\\/\\/docs\\.google\\.com/spreadsheets\\/d\\/[0-9a-zA-Z\\-_]+\\/edit\\#gid=([0-9]+)',
							errorMessage: 'Not a valid Sheet URL',
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
							regex: '((gid=)?[0-9]{1,})',
							errorMessage: 'Not a valid Sheet ID',
						},
					},
				],
			},
		],
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['append', 'appendOrUpdate', 'clear', 'delete', 'read', 'remove', 'update'],
			},
		},
	},
	...append.description,
	...clear.description,
	...create.description,
	...del.description,
	...read.description,
	...update.description,
	...appendOrUpdate.description,
];
