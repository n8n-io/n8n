import { INodeProperties } from 'n8n-workflow';

export const bankTransactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a Bank Transaction',
				action: 'Get a Bank Transaction',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many bankTransactions',
				action: 'Get many bankTransactions',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new bankTransaction',
				action: 'Create a Bank Transaction',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing bankTransaction',
				action: 'Update a Bank Transaction',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Bank Transaction',
				action: 'Delete a Bank Transaction',
			},
			{
				name: 'Action',
				value: 'action',
				description: 'Performs an action to a Bank Transaction',
				action: 'Action to a Bank Transaction',
			},
		],
		default: 'create',
	},
];

export const bankTransactionFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  bankTransaction:get                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bank Transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['get'],
			},
		},
	},
	// no includes available
	// {
	// 	displayName: 'Include',
	// 	name: 'include',
	// 	type: 'multiOptions',
	// 	description: 'Additional resources to fetch related to this resource.',
	// 	displayOptions: {
	// 		show: {
	// 			apiVersion: ['v5'],
	// 			resource: ['bankTransaction'],
	// 			operation: ['get'],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			name: 'Client',
	// 			value: 'client',
	// 		},
	// 		{
	// 			name: 'Invoices',
	// 			value: 'invoices',
	// 		},
	// 	],
	// 	default: [],
	// },
	/* -------------------------------------------------------------------------- */
	/*                                  bankTransaction:getAll                    */
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
				resource: ['bankTransaction'],
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'clientStatus',
				type: 'multiOptions',
				options: [
					{
						name: 'All',
						value: 'all'
					},
					{
						name: 'Unmatched',
						value: 'unmatched'
					},
					{
						name: 'Matched',
						value: 'matched'
					},
					{
						name: 'Converted',
						value: 'converted'
					},
					{
						name: 'Credit',
						value: 'credit'
					},
					{
						name: 'Debit',
						value: 'debit'
					},
				],
				default: '',
			},
		],
	},
	// no includes available
	// {
	// 	displayName: 'Include',
	// 	name: 'include',
	// 	type: 'multiOptions',
	// 	description: 'Additional resources to fetch related to this resource.',
	// 	displayOptions: {
	// 		show: {
	// 			apiVersion: ['v5'],
	// 			resource: ['bankTransaction'],
	// 			operation: ['getAll'],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			name: 'Client',
	// 			value: 'client',
	// 		},
	// 		{
	// 			name: 'Invoices',
	// 			value: 'invoices',
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
				resource: ['bankTransaction'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return all results or only up to a given perPage',
	},
	{
		displayName: 'Limit',
		name: 'perPage',
		type: 'number',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
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
	/*                                 bankTransaction:create                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Vendor',
				name: 'vendorId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getVendorsV5',
				},
				default: '',
			},
			{
				displayName: 'Account Type',
				name: 'accountType',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Bank Account Id',
				name: 'bankAccountId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Integration Id',
				name: 'bankIntegrationId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Transaction Rule Id',
				name: 'bankTransactionRuleId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Base Type',
				name: 'baseType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category Id',
				name: 'categoryId',
				type: 'boolean',
				default: '',
			},
			{
				displayName: 'Category Type',
				name: 'categoryType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency Id',
				name: 'currencyId',
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Expense Id',
				name: 'expenseId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Invoice Ids',
				name: 'invoiceIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Ninja Category Id',
				name: 'ninjaCategoryId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Payment Id',
				name: 'paymentId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status Id',
				name: 'statusId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction Id',
				name: 'transactionId',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 bankTransaction:update                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bank Transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
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
				resource: ['bankTransaction'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Vendor',
				name: 'vendorId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getVendorsV5',
				},
				default: '',
			},
			{
				displayName: 'Account Type',
				name: 'accountType',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Bank Account Id',
				name: 'bankAccountId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Integration Id',
				name: 'bankIntegrationId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Transaction Rule Id',
				name: 'bankTransactionRuleId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Base Type',
				name: 'baseType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category Id',
				name: 'categoryId',
				type: 'boolean',
				default: '',
			},
			{
				displayName: 'Category Type',
				name: 'categoryType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency Id',
				name: 'currencyId',
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Expense Id',
				name: 'expenseId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Invoice Ids',
				name: 'invoiceIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Ninja Category Id',
				name: 'ninjaCategoryId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Payment Id',
				name: 'paymentId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status Id',
				name: 'statusId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction Id',
				name: 'transactionId',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 bankTransaction:delete                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bank Transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['delete'],
			},
		},
	},
];
