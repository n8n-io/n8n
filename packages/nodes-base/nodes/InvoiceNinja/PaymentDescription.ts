import type { INodeProperties } from 'n8n-workflow';

export const paymentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['payment'],
			},
		},
		options: [
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
		],
		default: 'create',
	},
];

export const paymentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 payment:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Invoice Name or ID',
		name: 'invoice',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getInvoices',
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['payment'],
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
				operation: ['create'],
				resource: ['payment'],
			},
		},
		typeOptions: {
			minValue: 0,
		},
		default: 0,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				apiVersion: ['v4'],
				operation: ['create'],
				resource: ['payment'],
			},
		},
		options: [
			{
				displayName: 'Payment Type',
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
				displayName: 'Transfer Reference',
				name: 'transferReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
				type: 'string',
				default: '',
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
				operation: ['create'],
				resource: ['payment'],
			},
		},
		options: [
			{
				displayName: 'Payment Type',
				name: 'paymentType',
				type: 'options',
				options: [
					{
						name: 'Bank Transfer',
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
						name: 'Credit Card Other',
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
						name: 'Mollie Bank Transfer',
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
						name: 'Hosted Page',
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
						name: 'Direct Debit',
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
						name: 'Instant Bank Pay',
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
						name: 'Stripe Bank Transfer',
						value: 50,
					},
					{
						name: 'Cash App',
						value: 51,
					},
					{
						name: 'Pay Later',
						value: 52,
					},
				],
				default: 1,
			},
			{
				displayName: 'Transfer Reference',
				name: 'transferReference',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Private Notes',
				name: 'privateNotes',
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
				resource: ['payment'],
				operation: ['delete'],
			},
		},
	},
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
				resource: ['payment'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['payment'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				options: [
					{
						name: 'Client',
						value: 'client',
					},
				],
				default: 'client',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  payment:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['payment'],
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
				resource: ['payment'],
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['payment'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				options: [
					{
						name: 'Client',
						value: 'client',
					},
				],
				default: 'client',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Archived',
						value: 'archived',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
				],
				default: 'active',
			},
			{
				displayName: 'Created At',
				name: 'createdAt',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Updated At',
				name: 'updatedAt',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Is Deleted',
				name: 'isDeleted',
				type: 'boolean',
				default: false,
			},
		],
	},
];
