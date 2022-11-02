import { INodeProperties } from 'n8n-workflow';
import * as create from './create.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as del from './delete.operation';
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
				resource: ['event'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new event',
				action: 'Create a new event',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a event',
				action: 'Delete a event',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a event',
				action: 'Get a event',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many events',
				action: 'Get many events',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a event',
				action: 'Update a event',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['delete', 'get', 'update'],
			},
		},
	},

	...create.description,
	...del.description,
	...get.description,
	...getAll.description,
	...update.description,
];
