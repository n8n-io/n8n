import {
	INodeProperties,
} from 'n8n-workflow';

export const checkAccountTransactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: false,
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
				name: 'Create',
				value: 'create',
				description: 'Create a new transaction',
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		description: 'There are a multitude of parameter which can be used to filter. A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-invoices#filtering">this</> list.',
		default: {},
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
		options: [
			{
				displayName: 'Check Account ID',
				name: 'checkAccountId',
				description: 'Retrieve all transactions on this check account. Must be provided with Check Account Object Name.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Check Account Object Name',
				name: 'checkAccountObjectName',
				description: 'Only required if Check Account ID was provided. "CheckAccount" should be used as value.',
				type: 'string',
				default: 'CheckAccount',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				description: 'Retrieve all invoices with a date equal or lower',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Is Booked',
				name: 'isBooked',
				description: 'Only retrieve booked transactions',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Only Credit',
				name: 'onlyCredit',
				description: 'Only retrieve credit transactions',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Only Debit',
				name: 'onlyDebit',
				description: 'Only retrieve debit transactions',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Payee/Payer Name',
				name: 'payeePayerName',
				description: 'Only retrieve transactions with this payee / payer',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Payment Purpose',
				name: 'paymtPurpose',
				description: 'Only retrieve transactions with this payment purpose',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				description: 'Retrieve all invoices with a date equal or higher',
				type: 'dateTime',
				default: '',
			},
		],
	},
	// ----------------------------------------
	//     checkAccountTransaction: create
	// ----------------------------------------
	{
		displayName: 'Value Date',
		name: 'valueDate',
		description: 'Date the check account transaction was booked',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Amount',
		name: 'amount',
		description: 'Amount of the transaction',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Payee/Payer Name',
		name: 'payeePayerName',
		description: 'Name of the payee/payer',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Check Account',
		name: 'checkAccount',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Unique identifier of the check account',
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				type: 'string',
				default: 'CheckAccount',
				description: 'Model name, which is "CheckAccount"',
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
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Auto Map Transactions',
				name: 'autoMapTransactions',
				type: 'string',
				default: '1',
				description: 'Defines if transactions on this account are automatically mapped to invoice and vouchers when imported if possible',
			},
			{
				displayName: 'Enshrined',
				name: 'enshrined',
				type: 'dateTime',
				default: '',
				description: 'Defines if the transaction has been enshrined and can not be changed any more',
			},
			{
				displayName: 'Entry Date',
				name: 'entryDate',
				type: 'dateTime',
				default: '',
				description: 'Date the check account transaction was imported',
			},
			{
				displayName: 'Payment Purpose',
				name: 'paymtPurpose',
				type: 'string',
				default: '',
				description: 'Payment purpose of the transaction',
			},
			{
				displayName: 'Source Transaction',
				name: 'sourceTransaction',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				description: 'The check account transaction serving as the source of the rebooking',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: 0,
						description: 'Unique identifier of the check account transaction',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						default: 'CheckAccountTransaction',
						description: 'Model name, which is "CheckAccountTransaction"',
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'number',
				default: 100,
				description: 'Status of the check account transaction:<ul><li>100 <-> Created</li><li>200 <-> Linked</li><li>300 <-> Private</li><li>400 <-> Booked</li></ul>',
			},
			{
				displayName: 'Target Transaction',
				name: 'targetTransaction',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				description: 'The check account transaction serving as the target of the rebooking',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: 0,
						description: 'Unique identifier of the check account transaction',
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						default: 'CheckAccountTransaction',
						description: 'Model name, which is "CheckAccountTransaction"',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//     checkAccountTransaction: bookCollective
	// ----------------------------------------

	{
		displayName: 'Documents',
		name: 'documents',
		description: 'List of invoice, voucher and creditnote. Find the document Schema <a href="https://my.sevdesk.de/swaggerUI/index.html#/CheckAccountTransaction/bookCollective">here</a>.',
		type: 'json',
		required: true,
		default: '[]',
		displayOptions: {
			show: {
				resource: [
					'checkAccountTransaction',
				],
				operation: [
					'bookCollective',
				],
			},
		},
	},
];
