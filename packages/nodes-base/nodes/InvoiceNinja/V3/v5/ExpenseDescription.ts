import { INodeProperties } from 'n8n-workflow';

export const expenseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['expense'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an expense',
				action: 'Get an expense',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many expenses',
				action: 'Get many expenses',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new expense',
				action: 'Create an expense',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing expense',
				action: 'Update an expense',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an expense',
				action: 'Delete an expense',
			},
		],
		default: 'create',
	},
];

export const expenseFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  expense:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Expense ID',
		name: 'expenseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['expense'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource.',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['expense'],
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
		],
		default: [],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  expense:getAll                             */
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
				resource: ['expense'],
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
				displayName: 'Expense Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Client ID',
				name: 'clientId',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Include',
		name: 'include',
		type: 'multiOptions',
		description: 'Additional resources to fetch related to this resource.',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['expense'],
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
				resource: ['expense'],
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
				resource: ['expense'],
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
	/*                                 expense:create                             */
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
				resource: ['expense'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment Date',
				name: 'paymentDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Client',
				name: 'clientId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
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
				displayName: 'Bank Account',
				name: 'bankId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getBanksV5',
				},
				default: '',
			},
			{
				displayName: 'Currency ID',
				name: 'currencyId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category',
				name: 'categoryId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getExpenseCategoriesV5',
				},
				default: '',
			},
			{
				displayName: 'Should be invoiced',
				name: 'should_be_invoiced',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'User (Origin)',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
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
				displayName: 'Connected Project ID or Name',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
				},
				default: '',
			},
			{
				displayName: 'Connected Invoice ID or Name',
				name: 'invoiceId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getInvoicesV5',
				},
				default: '',
			},
			{
				displayName: 'Connected Recuring Expense ID or Name',
				name: 'recurringExpenseId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecuringExpensesV5',
				},
				default: '',
			},
			{
				displayName: 'Payment Type',
				name: 'entity_type',
				type: 'options',
				options: [
					{
						name: 'ACH',
						value: 5,
					},
					{
						name: 'Alipay',
						value: 28,
					},
					{
						name: 'American Express',
						value: 8,
					},
					{
						name: 'Apply Credit',
						value: 1,
					},
					{
						name: 'Bank Transfer',
						value: 2,
					},
					{
						name: 'Bitcoin',
						value: 32,
					},
					{
						name: 'Carte Blanche',
						value: 17,
					},
					{
						name: 'Cash',
						value: 3,
					},
					{
						name: 'Check',
						value: 16,
					},
					{
						name: 'Credit Card Other',
						value: 13,
					},
					{
						name: 'Debit',
						value: 4,
					},
					{
						name: 'Diners Card',
						value: 10,
					},
					{
						name: 'Discover Card',
						value: 9,
					},
					{
						name: 'EuroCard',
						value: 11,
					},
					{
						name: 'GoCardless',
						value: 31,
					},
					{
						name: 'Google Wallet',
						value: 15,
					},
					{
						name: 'iZettle',
						value: 24,
					},
					{
						name: 'JCB',
						value: 19,
					},
					{
						name: 'Laser',
						value: 20,
					},
					{
						name: 'Maestro',
						value: 21,
					},
					{
						name: 'MasterCard',
						value: 7,
					},
					{
						name: 'Money Order',
						value: 27,
					},
					{
						name: 'Nova',
						value: 12,
					},
					{
						name: 'Paypal',
						value: 14,
					},
					{
						name: 'SEPA',
						value: 30,
					},
					{
						name: 'Sofort',
						value: 29,
					},
					{
						name: 'Solo',
						value: 22,
					},
					{
						name: 'Swich',
						value: 23,
					},
					{
						name: 'Swish',
						value: 25,
					},
					{
						name: 'UnionPay',
						value: 18,
					},
					{
						name: 'Venmo',
						value: 26,
					},
					{
						name: 'Visa Card',
						value: 6,
					},
				],
				default: 1,
			},
			{
				displayName: 'Tax Name 1',
				name: 'taxName1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 2',
				name: 'taxName2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 3',
				name: 'taxName3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Rate 1',
				name: 'taxRate1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 2',
				name: 'taxRate2',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 3',
				name: 'taxRate3',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Transaction Reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction Id',
				name: 'transactionId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
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
			{
				displayName: 'Uses Inclusive Taxes',
				name: 'usesInclusiveTaxes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Calculate Tax by Amount',
				name: 'calculateTaxByAmount',
				type: 'boolean',
				default: false,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 expense:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Expense ID',
		name: 'expenseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['expense'],
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
				resource: ['expense'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Number',
				name: 'number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment Date',
				name: 'paymentDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Client',
				name: 'clientId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClientsV5',
				},
				default: '',
			},
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
				displayName: 'Bank Account',
				name: 'bankId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getBanksV5',
				},
				default: '',
			},
			{
				displayName: 'Currency ID',
				name: 'currencyId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category',
				name: 'categoryId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getExpenseCategoriesV5',
				},
				default: '',
			},
			{
				displayName: 'Should be invoiced',
				name: 'should_be_invoiced',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'User (Origin)',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUsersV5',
				},
				default: '',
			},
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
				displayName: 'Connected Project ID or Name',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getProjectsV5',
				},
				default: '',
			},
			{
				displayName: 'Connected Invoice ID or Name',
				name: 'invoiceId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getInvoicesV5',
				},
				default: '',
			},
			{
				displayName: 'Connected Recuring Expense ID or Name',
				name: 'recurringExpenseId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getRecuringExpensesV5',
				},
				default: '',
			},
			{
				displayName: 'Payment Type',
				name: 'entity_type',
				type: 'options',
				options: [
					{
						name: 'ACH',
						value: 5,
					},
					{
						name: 'Alipay',
						value: 28,
					},
					{
						name: 'American Express',
						value: 8,
					},
					{
						name: 'Apply Credit',
						value: 1,
					},
					{
						name: 'Bank Transfer',
						value: 2,
					},
					{
						name: 'Bitcoin',
						value: 32,
					},
					{
						name: 'Carte Blanche',
						value: 17,
					},
					{
						name: 'Cash',
						value: 3,
					},
					{
						name: 'Check',
						value: 16,
					},
					{
						name: 'Credit Card Other',
						value: 13,
					},
					{
						name: 'Debit',
						value: 4,
					},
					{
						name: 'Diners Card',
						value: 10,
					},
					{
						name: 'Discover Card',
						value: 9,
					},
					{
						name: 'EuroCard',
						value: 11,
					},
					{
						name: 'GoCardless',
						value: 31,
					},
					{
						name: 'Google Wallet',
						value: 15,
					},
					{
						name: 'iZettle',
						value: 24,
					},
					{
						name: 'JCB',
						value: 19,
					},
					{
						name: 'Laser',
						value: 20,
					},
					{
						name: 'Maestro',
						value: 21,
					},
					{
						name: 'MasterCard',
						value: 7,
					},
					{
						name: 'Money Order',
						value: 27,
					},
					{
						name: 'Nova',
						value: 12,
					},
					{
						name: 'Paypal',
						value: 14,
					},
					{
						name: 'SEPA',
						value: 30,
					},
					{
						name: 'Sofort',
						value: 29,
					},
					{
						name: 'Solo',
						value: 22,
					},
					{
						name: 'Swich',
						value: 23,
					},
					{
						name: 'Swish',
						value: 25,
					},
					{
						name: 'UnionPay',
						value: 18,
					},
					{
						name: 'Venmo',
						value: 26,
					},
					{
						name: 'Visa Card',
						value: 6,
					},
				],
				default: 1,
			},
			{
				displayName: 'Tax Name 1',
				name: 'taxName1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 2',
				name: 'taxName2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Name 3',
				name: 'taxName3',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Rate 1',
				name: 'taxRate1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 2',
				name: 'taxRate2',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax Rate 3',
				name: 'taxRate3',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Transaction Reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Transaction ID',
				name: 'transactionId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Public Notes',
				name: 'publicNotes',
				type: 'string',
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
			{
				displayName: 'Uses Inclusive Taxes',
				name: 'usesInclusiveTaxes',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Calculate Tax by Amount',
				name: 'calculateTaxByAmount',
				type: 'boolean',
				default: false,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 expense:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Expense ID',
		name: 'expenseId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				resource: ['expense'],
				operation: ['delete'],
			},
		},
	},
];
