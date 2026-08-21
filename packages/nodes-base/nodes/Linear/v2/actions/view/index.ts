import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteView from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteView as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['view'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a view',
				action: 'Create a view',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a view',
				action: 'Delete a view',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a view',
				action: 'Get a view',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many views',
				action: 'Get many views',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a view',
				action: 'Update a view',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteView.description,
	...get.description,
	...getAll.description,
	...update.description,
];
