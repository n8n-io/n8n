import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteProjectUpdate from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteProjectUpdate as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['projectUpdate'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a project update',
				action: 'Create a project update',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project update',
				action: 'Delete a project update',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a project update',
				action: 'Get a project update',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many project updates',
				action: 'Get many project updates',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a project update',
				action: 'Update a project update',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteProjectUpdate.description,
	...get.description,
	...getAll.description,
	...update.description,
];
