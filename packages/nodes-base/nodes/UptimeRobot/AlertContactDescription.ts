import type { INodeProperties } from 'n8n-workflow';

export const alertContactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['alertContact'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an alert contact',
				action: 'Create an alert contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an alert contact',
				action: 'Delete an alert contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an alert contact',
				action: 'Get an alert contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many alert contacts',
				action: 'Get many alert contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an alert contact',
				action: 'Update an alert contact',
			},
		],
		default: 'getAll',
	},
];

export const alertContactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                alertContact:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Friendly Name',
		name: 'friendlyName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['create'],
			},
		},
		description: 'The friendly name of the alert contact',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: '',
		options: [
			{
				name: 'Boxcar',
				value: 4,
			},
			{
				name: 'E-Mail',
				value: 2,
			},
			{
				name: 'Pushbullet',
				value: 6,
			},
			{
				name: 'Pushover',
				value: 9,
			},
			{
				name: 'SMS',
				value: 1,
			},
			{
				name: 'Twitter DM',
				value: 3,
			},
			{
				name: 'Webhook',
				value: 5,
			},
			// the commented option are not supported yet
			// {
			// 	name:'HipChat',
			// 	value:10,
			// },
			// {
			// 	name:'Slack',
			// 	value:11
			// },
			// {
			// 	name:'Zapier',
			// 	value:7,
			// },
		],
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['create'],
			},
		},
		description: 'The type of the alert contact',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['create'],
			},
		},
		description: 'The correspondent value for the alert contact type',
	},

	/* -------------------------------------------------------------------------- */
	/*                                alertContact:delete                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['delete', 'get'],
			},
		},
		description: 'The ID of the alert contact',
	},

	/* -------------------------------------------------------------------------- */
	/*                                alertContact:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Alert Contact IDs',
				name: 'alert_contacts',
				type: 'string',
				default: '',
				description: 'Alert contact IDs separated with dash, e.g. 236-1782-4790',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                alertContact:update                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['update'],
			},
		},
		description: 'The ID of the alert contact',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['alertContact'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Friendly Name',
				name: 'friendly_name',
				type: 'string',
				default: '',
				description: 'The friendly name of the alert contact',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description:
					'The correspondent value for the alert contact type (can only be used if it is a Webhook alert contact)',
			},
		],
	},
];
