import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteDrive from './deleteDrive.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as update from './update.operation';

export { create, deleteDrive, get, list, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a drive',
				action: 'Create a drive',
			},
			{
				name: 'Delete',
				value: 'deleteDrive',
				description: 'Delete a drive',
				action: 'Delete a drive',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a drive',
				action: 'Get a drive',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all drives',
				action: 'List all drives',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a drive',
				action: 'Update a drive',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['drive'],
			},
		},
	},
	{
		displayName: 'Drive',
		name: 'driveId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		hint: 'The Google Drive drive to operate on',
		modes: [
			{
				displayName: 'Drive',
				name: 'list',
				type: 'list',
				placeholder: 'Drive',
				typeOptions: {
					searchListMethod: 'driveSearch',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder: 'https://drive.google.com/drive/folders/0AaaaaAAAAAAAaa',
				extractValue: {
					type: 'regex',
					regex: 'https:\\/\\/drive\\.google\\.com\\/\\w+\\/folders\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'https:\\/\\/drive\\.google\\.com\\/\\w+\\/folders\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
							errorMessage: 'Not a valid Google Drive Drive URL',
						},
					},
				],
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				hint: 'The ID of the shared drive',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9\\-_]{2,}',
							errorMessage: 'Not a valid Google Drive Drive ID',
						},
					},
				],
				url: '=https://drive.google.com/drive/folders/{{$value}}',
			},
		],
		displayOptions: {
			show: {
				operation: ['deleteDrive', 'get', 'update'],
				resource: ['drive'],
			},
		},
		description: 'The ID of the drive',
	},
	...create.description,
	...deleteDrive.description,
	...get.description,
	...list.description,
	...update.description,
];
