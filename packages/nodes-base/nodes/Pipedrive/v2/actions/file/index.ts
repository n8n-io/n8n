import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteFile from './delete.operation';
import * as download from './download.operation';
import * as get from './get.operation';
import * as update from './update.operation';

export { create, deleteFile as delete, download, get, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a file',
				action: 'Create a file',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a file',
				action: 'Get a file',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a file',
				action: 'Update a file',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteFile.description,
	...download.description,
	...get.description,
	...update.description,
];
