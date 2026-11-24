import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteDeal from './delete.operation';
import * as duplicate from './duplicate.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { create, deleteDeal as delete, duplicate, get, getAll, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['deal'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a deal',
				action: 'Create a deal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
				action: 'Delete a deal',
			},
			{
				name: 'Duplicate',
				value: 'duplicate',
				description: 'Duplicate a deal',
				action: 'Duplicate a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a deal',
				action: 'Get a deal',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many deals',
				action: 'Get many deals',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search deals',
				action: 'Search deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
				action: 'Update a deal',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteDeal.description,
	...duplicate.description,
	...get.description,
	...getAll.description,
	...search.description,
	...update.description,
];
