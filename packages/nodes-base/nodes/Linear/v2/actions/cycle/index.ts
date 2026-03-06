import type { INodeProperties } from 'n8n-workflow';

import * as archive from './archive.operation';
import * as create from './create.operation';
import * as deleteCycle from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { archive, create, deleteCycle as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cycle'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a cycle',
				action: 'Archive a cycle',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a cycle',
				action: 'Create a cycle',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a cycle',
				action: 'Delete a cycle',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a cycle',
				action: 'Get a cycle',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many cycles',
				action: 'Get many cycles',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a cycle',
				action: 'Update a cycle',
			},
		],
		default: 'getAll',
	},
	...archive.description,
	...create.description,
	...deleteCycle.description,
	...get.description,
	...getAll.description,
	...update.description,
];
