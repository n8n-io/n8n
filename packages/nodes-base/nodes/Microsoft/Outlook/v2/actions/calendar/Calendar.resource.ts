import { INodeProperties } from 'n8n-workflow';
import * as create from './create.operation';
import * as createEvent from './createEvent.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as getEvents from './getEvents.operation';
import * as del from './delete.operation';
import * as update from './update.operation';

export { create, createEvent, del as delete, get, getAll, getEvents, update };

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
				action: 'Create a new calendar',
			},
			{
				name: 'Create Event',
				value: 'createEvent',
				description: 'Create a new event',
				action: 'Create a new event',
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
				description: 'Get a calendar',
				action: 'Get a calendar',
			},
			{
				name: 'Get Events',
				value: 'getEvents',
				description: 'Get a list of events in a calendar',
				action: 'Get a list of events in a calendar',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many calendars',
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
	{
		displayName: 'Calendar ID',
		name: 'calendarId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['calendar'],
				operation: ['delete', 'get', 'update'],
			},
		},
	},

	...create.description,
	...createEvent.description,
	...del.description,
	...get.description,
	...getAll.description,
	...getEvents.description,
	...update.description,
];
