import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as executeMethod from './executeMethod.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, get, getAll, update, del as delete, executeMethod };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['custom'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new item',
				action: 'Create an item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete an item',
			},
			{
				name: 'Execute a Method',
				value: 'executeMethod',
				description: 'Execute a method on a custom resource',
				action: 'Execute a method',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an item',
				action: 'Get an item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many items',
				action: 'Get many items',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an item',
				action: 'Update an item',
			},
		],
	},

	...create.description,
	...get.description,
	...getAll.description,
	...update.description,
	...del.description,
	...executeMethod.description,
];
