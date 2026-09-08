import type { INodeProperties } from 'n8n-workflow';

export const bankTransactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bank_transaction'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new bank transaction',
				action: 'Create a bank transaction',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a bank transaction',
				action: 'Delete a bank transaction',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of a bank transaction',
				action: 'Get a bank transaction',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get data of many bank transactions',
				action: 'Get many bank transactions',
			},
			{
				name: 'Match payment',
				value: 'matchPayment',
				description: 'Match payment to a bank transaction',
				action: 'Match payment to a bank transaction',
			},
		],
		default: 'create',
	},
];

export const bankTransactionFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 bankTransaction:create                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['bank_transaction'],
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
				displayName: 'Bank integration name or ID',
				name: 'bankIntegrationId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getBankIntegrations',
				},
				default: '',
			},
			{
				displayName: 'Base type',
				name: 'baseType',
				type: 'options',
				options: [
					{
						name: 'Deposit',
						value: 'CREDIT',
					},
					{
						name: 'Withdrawal',
						value: 'DEBIT',
					},
				],
				default: '',
			},
			{
				displayName: 'Currency name or ID',
				name: 'currencyId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCurrencies',
				},
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
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 bankTransaction:delete                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bank transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['bank_transaction'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  bankTransaction:get                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bank transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['bank_transaction'],
				operation: ['get'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                  bankTransaction:getAll                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['bank_transaction'],
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
				resource: ['bank_transaction'],
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
	/* -------------------------------------------------------------------------- */
	/*                                 bankTransaction:matchPayment               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bank transaction ID',
		name: 'bankTransactionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['bank_transaction'],
				operation: ['matchPayment'],
			},
		},
	},
	{
		displayName: 'Payment name or ID',
		name: 'paymentId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getPayments',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['bank_transaction'],
				operation: ['matchPayment'],
			},
		},
	},
];
