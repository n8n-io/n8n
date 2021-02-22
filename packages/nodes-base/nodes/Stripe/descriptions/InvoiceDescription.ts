import {
	INodeProperties,
} from 'n8n-workflow';

export const invoiceOperations = [
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
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Finalize',
				value: 'finalize',
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
				name: 'Send',
				value: 'send',
			},
			{
				name: 'Update',
				value: 'update',
			},
			{
				name: 'Void',
				value: 'void',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
			},
		},
	},
] as INodeProperties[];

export const invoiceFields = [
	// ----------------------------------
	//       invoice: create
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getCustomers',
		},
		description: 'ID of the customer to be associated with this invoice.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Invoice Items',
		name: 'invoiceItems',
		type: 'collection',
		placeholder: 'Add Invoice Item',
		description: 'Individual item in an invoice.',
		required: true,
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCustomers',
				},
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
				description: 'The integer amount in cents of the charge to be applied to the upcoming invoice. Passing in a negative amount will reduce the <code>amount_due</code> on the invoice.',
				typeOptions: {
					minValue: 0,
					maxValue: 99999999,
				},
			},
			{
				displayName: 'Currency',
				name: 'currency',
				description: 'Three-letter ISO currency code, in lowercase. It must be a <a href="https://stripe.com/docs/currencies">Stripe-supported currency</a>.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				description: 'Arbitrary string to describe the invoice item.',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the invoice to create.',
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
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Auto advance',
				name: 'auto_advance',
				type: 'boolean',
				default: false,
				description: 'Controls whether Stripe will perform automatic collection of the invoice. When false, the invoice’s state will not automatically advance without an explicit action.',
			},
			{
				displayName: 'Collection Method',
				name: 'collection_method',
				type: 'options',
				default: 'charge_automatically',
				options: [
					{
						name: 'Charge automatically',
						value: 'charge_automatically',
						description: 'Stripe will attempt to pay this invoice using the default source attached to the customer.',
					},
					{
						name: 'Send invoice',
						value: 'send_invoice',
						description: 'Stripe will email this invoice to the customer with payment instructions.',
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary string to describe the invoice to create.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the invoice to create.',
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
				displayName: 'Subscription ID',
				name: 'subscription',
				type: 'string',
				default: false,
				description: 'ID of the subscription to create an invoice for, if any. If not set, the created invoice will include all pending invoice items for the customer. If set, the created invoice will only include pending invoice items for that subscription and pending invoice items not associated with any subscription.',
			},
		],
	},

	// ----------------------------------
	//       invoice: delete
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getInvoices',
		},
		description: 'ID of the invoice to delete.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//       invoice: finalize
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getInvoices',
		},
		description: 'ID of the invoice to finalize.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'finalize',
				],
			},
		},
	},

	// ----------------------------------
	//       invoice: get
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getInvoices',
		},
		description: 'ID of the invoice to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'retrieve',
				],
			},
		},
	},

	// ----------------------------------
	//       invoice: getAll
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
					'invoice',
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
					'invoice',
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
	//       invoice: pay
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getInvoices',
		},
		description: 'ID of the invoice to request payment for.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'pay',
				],
			},
		},
	},

	// ----------------------------------
	//       invoice: update
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getInvoices',
		},
		description: 'ID of the invoice to update.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Auto advance',
				name: 'auto_advance',
				type: 'boolean',
				default: false,
				description: 'Controls whether Stripe will perform automatic collection of the invoice. When false, the invoice’s state will not automatically advance without an explicit action.',
			},
			{
				displayName: 'Collection Method',
				name: 'collection_method',
				type: 'options',
				default: 'charge_automatically',
				options: [
					{
						name: 'Charge automatically',
						value: 'charge_automatically',
						description: 'Stripe will attempt to pay this invoice using the default source attached to the customer.',
					},
					{
						name: 'Send invoice',
						value: 'send_invoice',
						description: 'Stripe will email this invoice to the customer with payment instructions.',
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Arbitrary string to describe the invoice to create.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				placeholder: 'Add Metadata Item',
				description: 'Set of key-value pairs to attach to the invoice to create.',
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
				displayName: 'Subscription ID',
				name: 'subscription',
				type: 'string',
				default: false,
				description: 'ID of the subscription to create an invoice for, if any. If not set, the created invoice will include all pending invoice items for the customer. If set, the created invoice will only include pending invoice items for that subscription and pending invoice items not associated with any subscription.',
			},
		],
	},

	// ----------------------------------
	//       invoice: void
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'options',
		required: true,
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getInvoices',
		},
		description: 'ID of the invoice to void.',
		displayOptions: {
			show: {
				resource: [
					'invoice',
				],
				operation: [
					'void',
				],
			},
		},
	},
] as INodeProperties[];
