
import * as getAll from './getAll';
import * as create from './create';
import * as get from './get';
import * as del from './del';
import * as update from './update';

import { INodeProperties } from 'n8n-workflow';

export {
	getAll,
	create,
	get,
	del as delete,
	update,
};

export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create new ticket',
				action: 'Create a ticket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete ticket',
				action: 'Delete a ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve ticket',
				action: 'Get a ticket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all tickets',
				action: 'Get all tickets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update ticket',
				action: 'Update a ticket',
			},
		],
		default: 'getAll',
	},
	...getAll.description,
	...create.description,
	...get.description,
	...del.description,
	...update.description,
] as INodeProperties[];
