import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteCustomerNeed from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteCustomerNeed as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customerNeed'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a customer need',
				action: 'Create a customer need',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a customer need',
				action: 'Delete a customer need',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a customer need',
				action: 'Get a customer need',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many customer needs',
				action: 'Get many customer needs',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a customer need',
				action: 'Update a customer need',
			},
		],
		default: 'getAll',
	},
	...create.description,
	...deleteCustomerNeed.description,
	...get.description,
	...getAll.description,
	...update.description,
];
