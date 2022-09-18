import * as getAll from './getAll';
import * as create from './create';
import * as del from './del';
import * as update from './update';
import * as get from './get';

import { INodeProperties } from 'n8n-workflow';

export { getAll, create, del as delete, update, get };

export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customer'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create new customer',
				action: 'Create a customer',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete customer',
				action: 'Delete a customer',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve customer',
				action: 'Get a customer',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many customers',
				action: 'Get many customers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update customer',
				action: 'Update a customer',
			},
		],
		default: 'getAll',
	},
	...getAll.description,
	...get.description,
	...create.description,
	...del.description,
	...update.description,
] as INodeProperties[];
