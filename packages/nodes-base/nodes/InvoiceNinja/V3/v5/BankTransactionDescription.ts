import type { INodeProperties } from 'n8n-workflow';

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
				name: 'Action',
				value: 'action',
				description: 'Performs an action to a Bank Transaction',
				action: 'Action to a Bank Transaction',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new bankTransaction',
				action: 'Create a Bank Transaction',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Bank Transaction',
				action: 'Delete a Bank Transaction',
			},
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
				name: 'Update',
				value: 'update',
				description: 'Update an existing bankTransaction',
				action: 'Update a Bank Transaction',
			},
		],
		default: 'getAll',
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
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Vendor',
				value: 'vendor',
			},
			{
				name: 'Expense',
				value: 'expense',
			},
		],
		default: [],
	},
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
						value: 'all',
					},
					{
						name: 'Converted',
						value: 'converted',
					},
					{
						name: 'Credit',
						value: 'credit',
					},
					{
						name: 'Debit',
						value: 'debit',
					},
					{
						name: 'Matched',
						value: 'matched',
					},
					{
						name: 'Unmatched',
						value: 'unmatched',
					},
				],
				default: [],
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
				resource: ['bankTransaction'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				name: 'Vendor',
				value: 'vendor',
			},
			{
				name: 'Expense',
				value: 'expense',
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
				resource: ['bankTransaction'],
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
				displayName: 'Vendor Name or ID',
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
				displayName: 'Bank Account ID',
				name: 'bankAccountId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Integration ID',
				name: 'bankIntegrationId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Transaction Rule ID',
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
				displayName: 'Category ID',
				name: 'categoryId',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Category Type',
				name: 'categoryType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency ID',
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
				displayName: 'Expense ID',
				name: 'expenseId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Invoice IDs',
				name: 'invoiceIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Ninja Category ID',
				name: 'ninjaCategoryId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Payment ID',
				name: 'paymentId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status ID',
				name: 'statusId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction ID',
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
				displayName: 'Vendor Name or ID',
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
				displayName: 'Bank Account ID',
				name: 'bankAccountId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Integration ID',
				name: 'bankIntegrationId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Bank Transaction Rule ID',
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
				displayName: 'Category ID',
				name: 'categoryId',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Category Type',
				name: 'categoryType',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Currency ID',
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
				displayName: 'Expense ID',
				name: 'expenseId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Invoice IDs',
				name: 'invoiceIds',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Ninja Category ID',
				name: 'ninjaCategoryId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Payment ID',
				name: 'paymentId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status ID',
				name: 'statusId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction ID',
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
	/* -------------------------------------------------------------------------- */
	/*                                  bankTransaction:action                    */
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
				resource: ['bankTransaction'],
				operation: ['action'],
			},
		},
		options: [
			{
				name: 'Convert Matched',
				value: 'convert_matched',
				action: 'Convert the match to a payment / expense',
			},
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a client',
			},
			{
				name: 'Restore',
				value: 'restore',
				action: 'Restore a client',
			},
		],
	},
	{
		displayName: 'Vendor ID',
		name: 'convertMatchedVendorId',
		description: 'Bei Angabe des Parameters wird eine Ausgabe erstellt',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['action'],
				action: ['convert_matched'],
			},
		},
	},
	{
		displayName: 'Invoice IDs',
		name: 'convertMatchedInvoiceIds',
		description: 'Bei Angabe des Parameters wird eine / mehrere Rechnungen verknüpft. Durch Komma getrennte Werte.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['action'],
				action: ['convert_matched'],
			},
		},
	},
	{
		displayName: 'Expense IDs',
		name: 'convertMatchedExpenseIds',
		description: 'Bei Angabe des Parameters wird eine / mehrere Ausgaben verknüpft. Durch Komma getrennte Werte.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['action'],
				action: ['convert_matched'],
			},
		},
	},
	{
		displayName: 'Invoice IDs',
		name: 'convertMatchedInvoiceIds',
		description: 'Bei Angabe des Parameters wird eine / mehrere Rechnungen verknüpft. Durch Komma getrennte Werte.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['action'],
				action: ['convert_matched'],
			},
		},
	},
	{
		displayName: 'Payment IDs',
		name: 'convertMatchedPaymentId',
		description: 'Bei Angabe des Parameters wird eine Zahlung verknüpft.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['bankTransaction'],
				operation: ['action'],
				action: ['convert_matched'],
			},
		},
	},
];
