import {
	INodeProperties,
} from 'n8n-workflow';

export const userOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'user',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all users',
			}
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const userFields = [

/* -------------------------------------------------------------------------- */
/*                                 user:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'A specific user subscription ID.',
	},
	{
		displayName: 'Plan ID',
		name: 'planId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Filter: The subscription plan ID.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 1,
		required: true,
		typeOptions: {
			minValue: 1,
			maxValue: 200
		},
		displayOptions: {
			show: {
				resource: [
					'user',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Number of subscription records to return per page.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'user',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'active',
				description: 'Filter: The user subscription status. Returns all active, past_due, trialing and paused subscription plans if not specified.',
				options: [
					{
						name: 'Active',
						value: 'active'
					},
					{
						name: 'Past Due',
						value: 'past_due'
					},
					{
						name: 'Paused',
						value: 'paused'
					},
					{
						name: 'Trialing',
						value: 'trialing'
					},
				]
			},
		],
	},
] as INodeProperties[];
