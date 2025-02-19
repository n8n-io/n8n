import type { INodeProperties } from 'n8n-workflow';

export const invoiceOperations: INodeProperties[] = [
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
				description: 'Create an invoice',
				action: 'Create an invoice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an invoice',
				action: 'Delete an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an invoice',
				action: 'Get an invoice',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many invoices',
				action: 'Get many invoices',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search invoices',
				action: 'Search invoices',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an invoice',
				action: 'Update an invoice',
			},
		],
		displayOptions: {
			show: {
				resource: ['invoice'],
			},
		},
	},
];

export const invoiceFields: INodeProperties[] = [
	// ----------------------------------
	//         invoice:create
	// ----------------------------------
	{
		displayName: 'Location ID',
		name: 'location_id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		description: 'The ID of the location that this invoice is associated with',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Payment Requests',
				name: 'payment_requests',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Payment Request',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Request',
						name: 'request',
						values: [
							{
								displayName: 'Request Type',
								name: 'request_type',
								type: 'options',
								options: [
									{
										name: 'Balance',
										value: 'BALANCE',
									},
								],
								default: 'BALANCE',
							},
							{
								displayName: 'Due Date',
								name: 'due_date',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Tipping Enabled',
								name: 'tipping_enabled',
								type: 'boolean',
								default: false,
							},
						],
					},
				],
			},
			{
				displayName: 'Invoice Number',
				name: 'invoice_number',
				type: 'string',
				default: '',
				description: 'A unique string that identifies the invoice',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The title of the invoice',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the invoice',
			},
			{
				displayName: 'Primary Recipient',
				name: 'primary_recipient',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Recipient Details',
				options: [
					{
						displayName: 'Details',
						name: 'details',
						values: [
							{
								displayName: 'Customer ID',
								name: 'customer_id',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//         invoice:get
	// ----------------------------------
	{
		displayName: 'Invoice ID',
		name: 'invoiceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['get', 'delete', 'update'],
			},
		},
		description: 'ID of the invoice',
	},

	// ----------------------------------
	//         invoice:update
	// ----------------------------------
	{
		displayName: 'Version',
		name: 'version',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['update'],
			},
		},
		description: 'The version of the invoice to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Payment Requests',
				name: 'payment_requests',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Payment Request',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Request',
						name: 'request',
						values: [
							{
								displayName: 'Request Type',
								name: 'request_type',
								type: 'options',
								options: [
									{
										name: 'Balance',
										value: 'BALANCE',
									},
								],
								default: 'BALANCE',
							},
							{
								displayName: 'Due Date',
								name: 'due_date',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'Tipping Enabled',
								name: 'tipping_enabled',
								type: 'boolean',
								default: false,
							},
						],
					},
				],
			},
			{
				displayName: 'Invoice Number',
				name: 'invoice_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------
	//         invoice:getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['invoice'],
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
				resource: ['invoice'],
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

	// ----------------------------------
	//         invoice:search
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['search'],
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
				resource: ['invoice'],
				operation: ['search'],
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
		displayName: 'Search Fields',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['invoice'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Location IDs',
				name: 'location_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of location IDs to filter by',
			},
			{
				displayName: 'Customer IDs',
				name: 'customer_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of customer IDs to filter by',
			},
		],
	},
];
