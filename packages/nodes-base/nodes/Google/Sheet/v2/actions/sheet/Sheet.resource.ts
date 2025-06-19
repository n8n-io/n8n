import type { INodeProperties } from 'n8n-workflow';

import * as append from './append.operation';
import * as appendOrUpdate from './appendOrUpdate.operation';
import * as clear from './clear.operation';
import * as create from './create.operation';
import * as del from './delete.operation';
import * as read from './read.operation';
import * as remove from './remove.operation';
import * as update from './update.operation';
import { GOOGLE_DRIVE_FILE_URL_REGEX, GOOGLE_SHEETS_SHEET_URL_REGEX } from '../../../../constants';

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
				name: 'Append or Update Row',
				value: 'appendOrUpdate',
				description: 'Append a new row or update an existing one (upsert)',
				action: 'Append or update row in sheet',
			},
			{
				name: 'Append Row',
				value: 'append',
				description: 'Create a new row in a sheet',
				action: 'Append row in sheet',
			},
			{
				name: 'Clear',
				value: 'clear',
				description: 'Delete all the contents or a part of a sheet',
				action: 'Clear sheet',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new sheet',
				action: 'Create sheet',
			},
			{
				name: 'Delete',
				value: 'remove',
				description: 'Permanently delete a sheet',
				action: 'Delete sheet',
			},
			{
				name: 'Delete Rows or Columns',
				value: 'delete',
				description: 'Delete columns or rows from a sheet',
				action: 'Delete rows or columns from sheet',
			},
			{
				name: 'Get Row(s)',
				value: 'read',
				description: 'Retrieve one or more rows from a sheet',
				action: 'Get row(s) in sheet',
			},
			{
				name: 'Update Row',
				value: 'update',
				description: 'Update an existing row in a sheet',
				action: 'Update row in sheet',
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
					regex: GOOGLE_DRIVE_FILE_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_DRIVE_FILE_URL_REGEX,
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
					regex: GOOGLE_SHEETS_SHEET_URL_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: GOOGLE_SHEETS_SHEET_URL_REGEX,
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
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Sheet1',
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
