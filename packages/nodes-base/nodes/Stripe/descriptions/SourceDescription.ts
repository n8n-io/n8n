import type { INodeProperties } from 'n8n-workflow';

export const sourceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a source',
				action: 'Create a source',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a source',
				action: 'Delete a source',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a source',
				action: 'Get a source',
			},
		],
		displayOptions: {
			show: {
				resource: ['source'],
			},
		},
	},
];

export const sourceFields: INodeProperties[] = [
	// ----------------------------------
	//       source: create
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer to attach the source to',
		displayOptions: {
			show: {
				resource: ['source'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'wechat',
		description: 'Type of source (payment instrument) to create',
		options: [
			{
				name: 'WeChat',
				value: 'wechat',
			},
		],
		displayOptions: {
			show: {
				resource: ['source'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 0,
		description:
			'Amount in cents to be collected for this charge, e.g. enter <code>100</code> for $1.00',
		typeOptions: {
			minValue: 0,
			maxValue: 99999999,
		},
		displayOptions: {
			show: {
				resource: ['source'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Currency Name or ID',
		name: 'currency',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCurrencies',
		},
		default: '',
		description:
			'Three-letter ISO currency code, e.g. <code>USD</code> or <code>EUR</code>. It must be a <a href="https://stripe.com/docs/currencies">Stripe-supported currency</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['source'],
				operation: ['create'],
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
				resource: ['source'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the source to create',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Metadata Properties',
						name: 'metadataProperties',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Statement Descriptor',
				name: 'statement_descriptor',
				type: 'string',
				default: '',
				description: "Arbitrary text to display on the customer's statement",
			},
		],
	},

	// ----------------------------------
	//          source: delete
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer whose source to delete',
		displayOptions: {
			show: {
				resource: ['source'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Source ID',
		name: 'sourceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the source to delete',
		displayOptions: {
			show: {
				resource: ['source'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//          source: get
	// ----------------------------------
	{
		displayName: 'Source ID',
		name: 'sourceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the source to retrieve',
		displayOptions: {
			show: {
				resource: ['source'],
				operation: ['get'],
			},
		},
	},
];
