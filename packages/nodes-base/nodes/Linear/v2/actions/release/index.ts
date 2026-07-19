import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteRelease from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteRelease as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['release'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a release',
				action: 'Create a release',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a release',
				action: 'Delete a release',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a release',
				action: 'Get a release',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many releases',
				action: 'Get many releases',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a release',
				action: 'Update a release',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteRelease.description,
	...get.description,
	...getAll.description,
	...update.description,
];
