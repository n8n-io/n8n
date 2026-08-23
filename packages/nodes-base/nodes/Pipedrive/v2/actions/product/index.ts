import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteProduct from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { create, deleteProduct as delete, get, getAll, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['product'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
				action: 'Create a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
				action: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a product',
				action: 'Get a product',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many products',
				action: 'Get many products',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search products',
				action: 'Search products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
				action: 'Update a product',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteProduct.description,
	...get.description,
	...getAll.description,
	...search.description,
	...update.description,
];
