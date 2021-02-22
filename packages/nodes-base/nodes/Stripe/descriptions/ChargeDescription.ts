import {
	INodeProperties,
} from 'n8n-workflow';

export const chargeOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'charge',
				],
			},
		},
	},
] as INodeProperties[];

export const chargeFields = [
	// ----------------------------------
	//       charge: create
	// ----------------------------------
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		required: true,
		default: 0,
		description: 'Amount to be collected for this charge. Expressed in the smallest currency unit,<br>usually cents. For example, for $1.00 enter <code>100</code>.',
		typeOptions: {
			minValue: 0,
			maxValue: 99999999,
		},
		displayOptions: {
			show: {
				resource: [
					'charge',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		required: true,
		default: '',
		description: 'Three-letter ISO currency code, in lowercase. It must be a <a href="https://stripe.com/docs/currencies">Stripe-supported currency</a>.',
		displayOptions: {
			show: {
				resource: [
					'charge',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer to be associated with this charge.',
		displayOptions: {
			show: {
				resource: [
					'charge',
				],
				operation: [
					'create',
				],
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
				resource: [
					'charge',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary string to describe the charge to create.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the charge to create.',
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
				displayName: 'Receipt Email',
				name: 'receipt_email',
				type: 'string',
				default: '',
				description: 'The email address to which the receipt for this charge will be sent.',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				description: 'Shipping information for the charge.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						values: [
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'A payment source to be charged, such as a credit card, a debit card, a bank account, etc.',
			},
		],
	},

	// ----------------------------------
	//       charge: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'charge',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: [
					'charge',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------
	//       charge: update
	// ----------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'charge',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary string to describe the charge to update.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the charge to update.',
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
				displayName: 'Receipt Email',
				name: 'receipt_email',
				type: 'string',
				default: '',
				description: 'The email address to which the receipt for this charge will be sent.',
			},
			{
				displayName: 'Shipping',
				name: 'shipping',
				type: 'fixedCollection',
				description: 'Shipping information for the charge.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Shipping Properties',
						name: 'shippingProperties',
						values: [
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Recipient Name',
								name: 'name',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'A payment source to be charged, such as a credit card, a debit card, a bank account, etc.',
			},
		],
	},

] as INodeProperties[];
