import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteActivity from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteActivity as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['activity'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an activity',
				action: 'Create an activity',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an activity',
				action: 'Delete an activity',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an activity',
				action: 'Get an activity',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many activities',
				action: 'Get many activities',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an activity',
				action: 'Update an activity',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteActivity.description,
	...get.description,
	...getAll.description,
	...update.description,
];
