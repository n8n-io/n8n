import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deletePerson from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { create, deletePerson as delete, get, getAll, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['person'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a person',
				action: 'Create a person',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a person',
				action: 'Delete a person',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a person',
				action: 'Get a person',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many persons',
				action: 'Get many persons',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search persons',
				action: 'Search persons',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a person',
				action: 'Update a person',
			},
		],
		default: 'create',
	},
	...create.description,
	...deletePerson.description,
	...get.description,
	...getAll.description,
	...search.description,
	...update.description,
];
