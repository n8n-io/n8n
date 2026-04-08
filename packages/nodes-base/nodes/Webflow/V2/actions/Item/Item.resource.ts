import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteItem from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteItem, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an item',
			},
			{
				name: 'Delete',
				value: 'deleteItem',
				action: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many items',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an item',
			},
		],
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
	},
	...create.description,
	...deleteItem.description,
	...get.description,
	...getAll.description,
	...update.description,
];
