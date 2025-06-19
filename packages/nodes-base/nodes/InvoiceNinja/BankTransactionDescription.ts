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
				name: 'Get Many',
				value: 'getAll',
				description: 'Get data of many bank transactions',
				action: 'Get many bank transactions',
			},
			{
				name: 'Match Payment',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
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
				displayName: 'Bank Integration Name or ID',
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
				displayName: 'Base Type',
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
				displayName: 'Currency Name or ID',
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
		displayName: 'Bank Transaction ID',
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
		displayName: 'Bank Transaction ID',
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
		displayName: 'Return All',
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
		displayName: 'Bank Transaction ID',
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
		displayName: 'Payment Name or ID',
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
