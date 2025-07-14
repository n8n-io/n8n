import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteUser from './deleteUser.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteUser, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an user',
				action: 'Create a user',
			},
			{
				name: 'Delete',
				value: 'deleteUser',
				description: 'Delete an user',
				action: 'Delete a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an user',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many users',
				action: 'Get many users',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an user',
				action: 'Update a user',
			},
		],
		default: 'create',
	},

	...create.description,
	...deleteUser.description,
	...get.description,
	...getAll.description,
	...update.description,
];
