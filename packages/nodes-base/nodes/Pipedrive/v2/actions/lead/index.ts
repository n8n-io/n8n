import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteLead from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, deleteLead as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lead'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a lead',
				action: 'Create a lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead',
				action: 'Delete a lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a lead',
				action: 'Get a lead',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many leads',
				action: 'Get many leads',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a lead',
				action: 'Update a lead',
			},
		],
		default: 'create',
	},
	...create.description,
	...deleteLead.description,
	...get.description,
	...getAll.description,
	...update.description,
];
