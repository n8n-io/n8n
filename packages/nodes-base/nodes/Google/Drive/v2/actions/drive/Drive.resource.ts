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
				description: 'Create a shared drive',
				action: 'Create shared drive',
			},
			{
				name: 'Delete',
				value: 'deleteDrive',
				description: 'Permanently delete a shared drive',
				action: 'Delete shared drive',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a shared drive',
				action: 'Get shared drive',
			},
			{
				name: 'Get Many',
				value: 'list',
				description: 'Get the list of shared drives',
				action: 'Get many shared drives',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a shared drive',
				action: 'Update shared drive',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['drive'],
			},
		},
	},
	...create.description,
	...deleteDrive.description,
	...get.description,
	...list.description,
	...update.description,
];
