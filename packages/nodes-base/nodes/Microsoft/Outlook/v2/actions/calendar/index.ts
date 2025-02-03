import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export { create, del as delete, get, getAll, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['calendar'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new calendar',
				action: 'Create a calendar',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a calendar',
				action: 'Delete a calendar',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a calendar',
				action: 'Get a calendar',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List and search calendars',
				action: 'Get many calendars',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a calendar',
				action: 'Update a calendar',
			},
		],
		default: 'getAll',
	},

	...create.description,
	...del.description,
	...get.description,
	...getAll.description,
	...update.description,
];
