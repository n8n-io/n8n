import type { INodeProperties } from 'n8n-workflow';

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
			},
		},
		options: [
			{
				name: 'List transactions',
				value: 'listtransactions',
				description:
					'Specify one or more query parameters to filter the transaction that appear in the response.',
				action: 'Get a list of transactions.',
			},
			{
				name: 'List all balances',
				value: 'listAllBalances',
				description:
					'Specify date time to list balances for that time that appear in the response.',
				action: 'Get a list of all balances',
			},
		],
		default: 'listtransactions',
	},
];

export const transactionFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*              Transaction Search: List Transactions                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Transaction ID',
		name: 'transaction_id',
		type: 'string',
		default: '',
		required: false,
		description:
			'Filters the transactions in the response by a PayPal transaction ID. A valid transaction ID is 17 characters long, except for an order ID, which is 19 characters long.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Transaction Type',
		name: 'transaction_type',
		type: 'string',
		default: '',
		required: false,
		description:
			'Filters the transactions in the response by a PayPal transaction event code. See Transaction event codes.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Transaction Status',
		name: 'transaction_status',
		type: 'string',
		default: '',
		required: false,
		description:
			'Filters the transactions in the response by a PayPal transaction status code. Value is: D,P,S,V',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Transaction Amount',
		name: 'transaction_amount',
		type: 'string',
		default: '',
		required: false,
		description:
			'Filters the transactions in the response by a gross transaction amount range. Specify the range as <start-range> TO <end-range>, where <start-range> is the lower limit of the gross PayPal transaction amount and <end-range> is the upper limit of the gross transaction amount. Specify the amounts in lower denominations. For example, to search for transactions from $5.00 to $10.05, specify [500 TO 1005].',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Transaction Currency',
		name: 'transaction_currency',
		type: 'string',
		default: '',
		required: false,
		description:
			'Filters the transactions in the response by a three-character ISO-4217 currency code for the PayPal transaction currency.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Start Date',
		name: 'start_date',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Filters the transactions in the response by a start date and time, in Internet date and time format. Seconds are required. Fractional seconds are optional.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'End Date (Max Range: 31 days)',
		name: 'end_date',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Filters the transactions in the response by an end date and time, in Internet date and time format. Seconds are required. Fractional seconds are optional. The maximum supported range is 31 days.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Payment Instrument Type',
		name: 'payment_instrument_type',
		type: 'string',
		default: '',
		required: false,
		description:
			'Filters the transactions in the response by a payment instrument type. Value is either: CREDITCARD or DEBITCARD. If you omit this parameter, the API does not apply this filter.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Store ID',
		name: 'store_id',
		type: 'string',
		default: '',
		required: false,
		description: 'Filters the transactions in the response by a store ID.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Terminal ID',
		name: 'terminal_id',
		type: 'string',
		default: '',
		required: false,
		description: 'Filters the transactions in the response by a terminal ID.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		default: '',
		required: false,
		description:
			'Indicates which fields appear in the response. Value is a single field or a comma-separated list of fields. The transaction_info value returns only the transaction details in the response. To include all fields in the response, specify fields=all.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},
	{
		displayName: 'Balance Affecting Records Only',
		name: 'balance_affecting_records_only',
		type: 'string',
		default: '',
		required: false,
		description:
			'Indicates whether the response includes only balance-impacting transactions or all transactions. Value is either: Y,N',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listtransactions'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*            Transaction Search: List All Balances                           */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'As of Time',
		name: 'as_of_time',
		type: 'dateTime',
		default: '',
		required: true,
		description:
			'Lists balances in the response at the date time provided. Will return the last refreshed balance in the system when not provided.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listAllBalances'],
			},
		},
	},
	{
		displayName: 'Currency Code',
		name: 'currency_code',
		type: 'string',
		default: 'ALL',
		required: true,
		description:
			'Filters the transactions in the response by a three-character ISO-4217 currency code for the PayPal transaction currency.',
		displayOptions: {
			show: {
				resource: ['transactionSearch'],
				operation: ['listAllBalances'],
			},
		},
	},
];
