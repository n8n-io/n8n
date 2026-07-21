import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
// `delete` is reserved — alias as `del`.
import * as del from './delete.operation';
import * as get from './get.operation';

export { create, get, del as delete };

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
				name: 'Create',
				value: 'create',
				description: 'Create an item in an existing list',
				action: 'Create item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of a single item',
				action: 'Get item',
			},
		],
		default: 'get',
	},

	...create.description,
	...get.description,
	...del.description,
];
