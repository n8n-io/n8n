import type { INodeProperties } from 'n8n-workflow';

export const numberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['number'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a number from the account',
				action: 'Delete a number',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details for a single active number',
				action: 'Get an active number',
			},
			{
				name: 'Get Active',
				value: 'getActive',
				description: 'List all active numbers on the account',
				action: 'Get active numbers',
			},
			{
				name: 'Get Available',
				value: 'getAvailable',
				description: 'Search for available phone numbers',
				action: 'Get available numbers',
			},
			{
				name: 'Order',
				value: 'order',
				description: 'Order a phone number',
				action: 'Order a number',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update friendly name or forwarding settings',
				action: 'Update an active number',
			},
		],
		default: 'getActive',
	},
];

export const numberFields: INodeProperties[] = [
	// getAvailable filters
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['number'],
				operation: ['getAvailable'],
			},
		},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'DE',
				description: 'ISO 3166-1 alpha-2 country code',
			},
			{
				displayName: 'SMS Capable',
				name: 'features_sms',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'A2P SMS Capable',
				name: 'features_a2p_sms',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Voice Capable',
				name: 'features_voice',
				type: 'boolean',
				default: false,
			},
		],
	},
	// order
	{
		displayName: 'Number',
		name: 'number',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['number'],
				operation: ['order', 'get', 'update', 'delete'],
			},
		},
		description: 'Phone number',
	},
	{
		displayName: 'Payment Interval',
		name: 'payment_interval',
		type: 'options',
		options: [
			{ name: 'Annually', value: 'annually' },
			{ name: 'Monthly', value: 'monthly' },
		],
		default: 'annually',
		displayOptions: {
			show: {
				resource: ['number'],
				operation: ['order'],
			},
		},
	},
	// update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['number'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Friendly Name',
				name: 'friendly_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'SMS Forward (Comma-Separated)',
				name: 'sms_forward',
				type: 'string',
				default: '',
				description: 'Phone numbers for SMS forwarding, separated by commas',
			},
			{
				displayName: 'Email Forward (Comma-Separated)',
				name: 'email_forward',
				type: 'string',
				default: '',
				description: 'Email addresses for SMS forwarding, separated by commas',
			},
			{
				displayName: 'Slack Forward',
				name: 'slack_forward',
				type: 'string',
				default: '',
				description: 'Slack webhook URL',
			},
		],
	},
	// delete
	{
		displayName: 'Delete Immediately',
		name: 'delete_immediately',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['number'],
				operation: ['delete'],
			},
		},
		description:
			'Whether to delete immediately. Otherwise the number is removed at end of billing period.',
	},
];
