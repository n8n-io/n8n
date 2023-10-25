import type { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many users',
				action: 'Get many users',
			},
		],
		default: 'getAll',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 user:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
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
		default: 100,
		required: true,
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
				jsonParameters: [true],
			},
		},
		description: 'Attributes in JSON form',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
				jsonParameters: [false],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Plan ID',
				name: 'planId',
				type: 'string',
				default: '',
				description: 'Filter: The subscription plan ID',
			},
			{
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				type: 'string',
				default: '',
				description: 'A specific user subscription ID',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'active',
				description:
					'Filter: The user subscription status. Returns all active, past_due, trialing and paused subscription plans if not specified.',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Past Due',
						value: 'past_due',
					},
					{
						name: 'Paused',
						value: 'paused',
					},
					{
						name: 'Trialing',
						value: 'trialing',
					},
				],
			},
		],
	},
];
