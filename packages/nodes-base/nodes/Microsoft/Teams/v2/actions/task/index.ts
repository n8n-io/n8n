import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteTask from './deleteTask.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteTask, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task',
				action: 'Create task',
			},
			{
				name: 'Delete',
				value: 'deleteTask',
				description: 'Delete a task',
				action: 'Delete task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task',
				action: 'Get task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
				action: 'Update task',
			},
		],
		default: 'create',
	},

	...create.description,
	...deleteTask.description,
	...get.description,
	...getAll.description,
	...update.description,
];
