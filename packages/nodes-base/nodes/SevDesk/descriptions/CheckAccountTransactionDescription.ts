import {
	INodeProperties,
} from 'n8n-workflow';

export const checkAccountTransactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
			},
		},
		options: [
			{
				name: 'Book Collective',
				value: 'bookCollective',
				description: 'Book multiple documents on the transaction. The documents sum must not exceed the transaction amount.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all transactions depending on the filters defined in the query',
			},
		],
		default: 'getAll',
	},
];

export const checkAccountTransactionFields: INodeProperties[] = [
	// ----------------------------------------
	//     checkAccountTransaction: getAll
	// ----------------------------------------
	{
		displayName: 'checkAccount[id]',
		name: 'checkAccount[id]',
		description: 'Retrieve all transactions on this check account. Must be provided with checkAccount[objectName].',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'checkAccount[objectName]',
		name: 'checkAccount[objectName]',
		description: 'Only required if checkAccount[id] was provided. \'CheckAccount\' should be used as value.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'isBooked',
		name: 'isBooked',
		description: 'Only retrieve booked transactions',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'paymtPurpose',
		name: 'paymtPurpose',
		description: 'Only retrieve transactions with this payment purpose',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'startDate',
		name: 'startDate',
		description: 'Only retrieve transactions from this date on',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'endDate',
		name: 'endDate',
		description: 'Only retrieve transactions up to this date',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'payeePayerName',
		name: 'payeePayerName',
		description: 'Only retrieve transactions with this payee / payer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'onlyCredit',
		name: 'onlyCredit',
		description: 'Only retrieve credit transactions',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'onlyDebit',
		name: 'onlyDebit',
		description: 'Only retrieve debit transactions',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
