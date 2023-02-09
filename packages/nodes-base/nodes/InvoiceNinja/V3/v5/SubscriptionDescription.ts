import type { INodeProperties } from 'n8n-workflow';

export const subscriptionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
			},
		},
		options: [
			{
				name: 'Action',
				value: 'action',
				description: 'Performs an action to a subscription',
				action: 'Action to a subscription',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new subscription',
				action: 'Create a subscription',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a subscription',
				action: 'Delete a subscription',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a subscription',
				action: 'Get a subscription',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many subscriptions',
				action: 'Get many subscriptions',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing subscription',
				action: 'Update a subscription',
			},
		],
		default: 'getAll',
	},
];

export const subscriptionFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  subscription:get                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['get'],
			},
		},
	},
	// include does not exists
	// {
	// 	displayName: 'Include',
	// 	name: 'include',
	// 	type: 'multiOptions',
	// 	description: 'Additional resources to fetch related to this resource.',
	// 	displayOptions: {
	// 		show: {
	// 			apiVersion: ['v5'],
	// 			resource: ['subscription'],
	// 			operation: ['get'],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			name: 'Client',
	// 			value: 'client',
	// 		},
	// 	],
	// 	default: [],
	// },
	/* -------------------------------------------------------------------------- */
	/*                                  subscription:getAll                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'filter',
				type: 'string',
				default: '',
			},
		],
	},
	// include does not exists
	// {
	// 	displayName: 'Include',
	// 	name: 'include',
	// 	type: 'multiOptions',
	// 	description: 'Additional resources to fetch related to this resource.',
	// 	displayOptions: {
	// 		show: {
	// 			apiVersion: ['v5'],
	// 			resource: ['subscription'],
	// 			operation: ['getAll'],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			name: 'Client',
	// 			value: 'client',
	// 		},
	// 	],
	// 	default: [],
	// },
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'perPage',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['getAll'],
			},
			hide: {
				returnAll: [true],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 subscription:create                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'User (Assigned) Name or ID',
				name: 'assignedUserId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
			{
				displayName: 'Allow Cancelation',
				name: 'allowCancellation',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Allow Plan Changes',
				name: 'allowPlanChanges',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Allow Query Overrides',
				name: 'allowQueryOverrides',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Auto Bill',
				name: 'autoBill',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency Name or ID',
				name: 'currencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrenciesV5',
				},
				default: '',
			},
			{
				displayName: 'Frequency Name or ID',
				name: 'frequencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getFrequenciesV5',
				},
				default: '',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Max Seats Limit',
				name: 'maxSeatsLimit',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Optional Product IDs',
				name: 'optionalProductIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Optional Recurring Product IDs',
				name: 'optionalRecurringProductIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Per Seat Enabled',
				name: 'perSeatEnabled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Product IDs',
				name: 'productIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Promo Code',
				name: 'promoCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Promo Discount',
				name: 'promoDiscount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Recurring Product IDs',
				name: 'recurringProductIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Refund Period',
				name: 'refundPeriod',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Registration Required',
				name: 'registrationRequired',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Trial Duration',
				name: 'trialDuration',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Trial Enabled',
				name: 'trialEnabled',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Use Inventory Management',
				name: 'useInventoryManagement',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Webhook Configuration',
				name: 'webhookConfiguration',
				type: 'json',
				default:
					'{ "post_purchase_body": "string", "post_purchase_headers": { "key": "value" }, "post_purchase_rest_method": "string", "post_purchase_url": "string", "return_url": "string" }',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 subscription:update                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User (Assigned) Name or ID',
				name: 'assignedUserId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
			{
				displayName: 'Allow Cancelation',
				name: 'allowCancellation',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Allow Plan Changes',
				name: 'allowPlanChanges',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Allow Query Overrides',
				name: 'allowQueryOverrides',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Auto Bill',
				name: 'autoBill',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency Name or ID',
				name: 'currencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrenciesV5',
				},
				default: '',
			},
			{
				displayName: 'Frequency Name or ID',
				name: 'frequencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getFrequenciesV5',
				},
				default: '',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Max Seats Limit',
				name: 'maxSeatsLimit',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Optional Product IDs',
				name: 'optionalProductIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Optional Recurring Product IDs',
				name: 'optionalRecurringProductIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Per Seat Enabled',
				name: 'perSeatEnabled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Product IDs',
				name: 'productIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Promo Code',
				name: 'promoCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Promo Discount',
				name: 'promoDiscount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Recurring Product IDs',
				name: 'recurringProductIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Refund Period',
				name: 'refundPeriod',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Registration Required',
				name: 'registrationRequired',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Trial Duration',
				name: 'trialDuration',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Trial Enabled',
				name: 'trialEnabled',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Use Inventory Management',
				name: 'useInventoryManagement',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Webhook Configuration',
				name: 'webhookConfiguration',
				type: 'json',
				default:
					'{ "post_purchase_body": "string", "post_purchase_headers": { "key": "value" }, "post_purchase_rest_method": "string", "post_purchase_url": "string", "return_url": "string" }',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 subscription:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  subscription:action                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['action'],
			},
		},
	},
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['subscription'],
				operation: ['action'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive an subscription',
			},
			{
				name: 'Restore',
				value: 'restore',
				action: 'Restore an subscription',
			},
		],
	},
];
