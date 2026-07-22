import type { INodeProperties } from 'n8n-workflow';

import * as del from './delete.operation';
import * as get from './get.operation';
import * as update from './update.operation';

export { del as delete, get, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of a single item',
				action: 'Get item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete item',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an item in an existing list',
				action: 'Update item in a list',
			},
		],
		default: 'get',
	},

	...get.description,
	...del.description,
	...update.description,
];
