import type { INodeProperties } from 'n8n-workflow';

export const paymentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
			},
		},
		options: [
			{
				name: 'Action',
				value: 'action',
				description: 'Performs an action to an payment',
				action: 'Action to an payment',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new payment',
				action: 'Create a payment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a payment',
				action: 'Delete a payment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a payment',
				action: 'Get a payment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many payments',
				action: 'Get many payments',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing payment',
				action: 'Update a payment',
			},
		],
		default: 'getAll',
	},
];

export const paymentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  payment:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Client',
				value: 'client',
			},
			{
				name: 'Vendor',
				value: 'vendor',
			},
			{
				name: 'Invoices',
				value: 'invoices',
			},
		],
		default: [],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  payment:getAll                              */
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
				resource: ['payment'],
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
			{
				displayName: 'Payment Number',
				name: 'number',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'Client',
				value: 'client',
			},
			{
				name: 'Vendor',
				value: 'vendor',
			},
			{
				name: 'Invoices',
				value: 'invoices',
			},
		],
		default: [],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
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
				resource: ['payment'],
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
	/*                                 payment:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Client',
		name: 'clientId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getClientsV5',
		},
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['create'],
			},
		},
		typeOptions: {
			minValue: 0,
		},
		required: true,
		default: 0,
	},
	{
		displayName: 'Assign Invoices',
		name: 'assignInvoicesUi',
		placeholder: 'Add Invoice to Assign',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				name: 'assignInvoicesValues',
				displayName: 'Invoice',
				values: [
					{
						displayName: 'Invoice',
						name: 'invoiceId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a><br/>This invoice will be addes as paymentables with the full amount of the payment.',
						typeOptions: {
							loadOptionsMethod: 'getInvoicesV5',
						},
						default: '',
					},
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						default: 0,
					},
				],
			},
		],
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
				resource: ['payment'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'User (Assigned)',
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
				displayName: 'Transaction Reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment Type',
				name: 'typeId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPaymentTypesV5',
				},
				default: 1,
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'exchangeRate',
				type: 'number',
				default: 1,
			},
			{
				displayName: 'Exchange Currency ID',
				name: 'exchangeCurrencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrenciesID',
				},
				default: ''
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 payment:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Assign Additional Invoices',
		name: 'assignInvoicesUi',
		placeholder: 'Add Invoice to Assign',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				name: 'assignInvoicesValues',
				displayName: 'Invoice',
				values: [
					{
						displayName: 'Invoice',
						name: 'invoiceId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a><br/>This invoice will be addes as paymentables with the full amount of the payment.',
						typeOptions: {
							loadOptionsMethod: 'getInvoicesV5',
						},
						default: '',
					},
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						default: 0,
					},
				],
			},
		],
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
				resource: ['payment'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'User (Assigned)',
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
				displayName: 'Transaction Reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment Type',
				name: 'typeId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPaymentTypesV5',
				},
				default: 1,
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Exchange Rate',
				name: 'exchangeRate',
				type: 'number',
				default: 1,
			},
			{
				displayName: 'Exchange Currency ID',
				name: 'exchangeCurrencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrenciesID',
				},
				default: ''
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Custom Value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 3',
				name: 'customValue3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Value 4',
				name: 'customValue4',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 payment:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  payment:action                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Payment ID',
		name: 'paymentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
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
				resource: ['payment'],
				operation: ['action'],
			},
		},
		options: [
			{
				name: 'Send Email',
				value: 'email',
				action: 'Send Email a payment',
			},
			{
				name: 'Refund',
				value: 'refund',
				action: 'Refund a payment',
			},
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a payment',
			},
			{
				name: 'Restore',
				value: 'restore',
				action: 'Restore a payment',
			},
		],
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['action'],
				action: ['refund'],
			},
		},
		typeOptions: {
			minValue: 0,
		},
		required: true,
		default: 0,
	},
	{
		displayName: 'Refund Invoices',
		name: 'refundInvoicesUi',
		placeholder: 'Add Invoice to Refund',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['action'],
				action: ['refund'],
			},
		},
		default: {},
		options: [
			{
				name: 'refundInvoicesValues',
				displayName: 'Invoice',
				values: [
					{
						displayName: 'Invoice',
						name: 'invoiceId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a><br/>This invoice will be addes as paymentables with the full amount of the payment.',
						typeOptions: {
							loadOptionsMethod: 'getInvoicesV5',
						},
						default: '',
					},
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						default: 0,
					},
				],
			},
		],
	},
	{
		displayName: 'Send E-Mail',
		name: 'emailReceipt',
		type: 'boolean',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['payment'],
				operation: ['action'],
				action: ['refund'],
			},
		},
		default: false,
	},
];
