import type { INodeProperties } from 'n8n-workflow';

export const expenseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['expense'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new expense',
				action: 'Create an expense',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an expense',
				action: 'Delete an expense',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an expense',
				action: 'Get an expense',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get data of many expenses',
				action: 'Get many expenses',
			},
		],
		default: 'create',
	},
];

export const expenseFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 expense:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v4'],
				operation: ['create'],
				resource: ['expense'],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Client name or ID',
				name: 'client',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClients',
				},
				default: '',
			},
			{
				displayName: 'Custom value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category name or ID',
				name: 'category',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getExpenseCategories',
				},
				default: '',
			},
			{
				displayName: 'Expense date',
				name: 'expenseDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment date',
				name: 'paymentDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment type',
				name: 'paymentType',
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
						name: 'Apply credit',
						value: 1,
					},
					{
						name: 'Bank transfer',
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
						name: 'Credit card other',
						value: 13,
					},
					{
						name: 'Debit',
						value: 4,
					},
					{
						name: 'Diners card',
						value: 10,
					},
					{
						name: 'Discover card',
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
						name: 'Money order',
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
						name: 'Visa card',
						value: 6,
					},
				],
				default: 1,
			},
			{
				displayName: 'Private notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Public notes',
				name: 'publicNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax name 1',
				name: 'taxName1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax name 2',
				name: 'taxName2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax rate 1',
				name: 'taxRate1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax rate 2',
				name: 'taxRate2',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Transaction reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Vendor name or ID',
				name: 'vendor',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getVendors',
				},
				default: '',
			},
		],
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v5'],
				operation: ['create'],
				resource: ['expense'],
			},
		},
		options: [
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Client name or ID',
				name: 'client',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getClients',
				},
				default: '',
			},
			{
				displayName: 'Custom value 1',
				name: 'customValue1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom value 2',
				name: 'customValue2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category name or ID',
				name: 'category',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getExpenseCategories',
				},
				default: '',
			},
			{
				displayName: 'Expense date',
				name: 'expenseDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment date',
				name: 'paymentDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Payment type',
				name: 'paymentType',
				type: 'options',
				options: [
					{
						name: 'Bank transfer',
						value: 1,
					},
					{
						name: 'Cash',
						value: 2,
					},
					{
						name: 'ACH',
						value: 4,
					},
					{
						name: 'Visa',
						value: 5,
					},
					{
						name: 'Mastercard',
						value: 6,
					},
					{
						name: 'American Express',
						value: 7,
					},
					{
						name: 'Discover',
						value: 8,
					},
					{
						name: 'Diners',
						value: 9,
					},
					{
						name: 'Eurocard',
						value: 10,
					},
					{
						name: 'Nova',
						value: 11,
					},
					{
						name: 'Credit card other',
						value: 12,
					},
					{
						name: 'PayPal',
						value: 13,
					},
					{
						name: 'Check',
						value: 15,
					},
					{
						name: 'Carte Blanche',
						value: 16,
					},
					{
						name: 'UnionPay',
						value: 17,
					},
					{
						name: 'JCB',
						value: 18,
					},
					{
						name: 'Laser',
						value: 19,
					},
					{
						name: 'Maestro',
						value: 20,
					},
					{
						name: 'Solo',
						value: 21,
					},
					{
						name: 'Switch',
						value: 22,
					},
					{
						name: 'Venmo',
						value: 24,
					},
					{
						name: 'Alipay',
						value: 27,
					},
					{
						name: 'Sofort',
						value: 28,
					},
					{
						name: 'SEPA',
						value: 29,
					},
					{
						name: 'GoCardless',
						value: 30,
					},
					{
						name: 'Crypto',
						value: 31,
					},
					{
						name: 'Credit',
						value: 32,
					},
					{
						name: 'Zelle',
						value: 33,
					},
					{
						name: 'Mollie bank transfer',
						value: 34,
					},
					{
						name: 'KBC',
						value: 35,
					},
					{
						name: 'Bancontact',
						value: 36,
					},
					{
						name: 'iDEAL',
						value: 37,
					},
					{
						name: 'Hosted page',
						value: 38,
					},
					{
						name: 'Giropay',
						value: 39,
					},
					{
						name: 'Przelewy24',
						value: 40,
					},
					{
						name: 'EPS',
						value: 41,
					},
					{
						name: 'Direct debit',
						value: 42,
					},
					{
						name: 'BECS',
						value: 43,
					},
					{
						name: 'ACSS',
						value: 44,
					},
					{
						name: 'Instant bank pay',
						value: 45,
					},
					{
						name: 'FPX',
						value: 46,
					},
					{
						name: 'Klarna',
						value: 47,
					},
					{
						name: 'Interac E-Transfer',
						value: 48,
					},
					{
						name: 'BACS',
						value: 49,
					},
					{
						name: 'Stripe bank transfer',
						value: 50,
					},
					{
						name: 'Cash App',
						value: 51,
					},
					{
						name: 'Pay later',
						value: 52,
					},
				],
				default: 1,
			},
			{
				displayName: 'Private notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Public notes',
				name: 'publicNotes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax name 1',
				name: 'taxName1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax name 2',
				name: 'taxName2',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax rate 1',
				name: 'taxRate1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Tax rate 2',
				name: 'taxRate2',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Transaction reference',
				name: 'transactionReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Vendor name or ID',
				name: 'vendor',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getVendors',
				},
				default: '',
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
				resource: ['expense'],
				operation: ['delete'],
			},
		},
	},
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
				resource: ['expense'],
				operation: ['get'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  expense:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['expense'],
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
				resource: ['expense'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 60,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
