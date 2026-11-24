import type { INodeProperties } from 'n8n-workflow';

import * as add from './add.operation';
import * as getAll from './getAll.operation';
import * as remove from './remove.operation';
import * as update from './update.operation';

export { add, getAll, remove, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['dealProduct'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a product to a deal',
				action: 'Add a product to a deal',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many products of a deal',
				action: 'Get many products of a deal',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a product from a deal',
				action: 'Remove a product from a deal',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product in a deal',
				action: 'Update a product in a deal',
			},
		],
		default: 'add',
	},
	...add.description,
	...getAll.description,
	...remove.description,
	...update.description,
];
