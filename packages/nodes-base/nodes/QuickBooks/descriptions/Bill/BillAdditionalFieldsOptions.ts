export const billAdditionalFieldsOptions = [
	{
		displayName: 'Accounts Payable Account',
		name: 'APAccountRef',
		placeholder: 'Add APA Fields',
		type: 'fixedCollection',
		default: {},
		options: [
			{
				displayName: 'Details',
				name: 'details',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'ID',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Balance',
		name: 'Balance',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Currency',
		name: 'CurrencyRef',
		placeholder: 'Add Currency Fields',
		type: 'fixedCollection',
		default: {},
		options: [
			{
				displayName: 'Details',
				name: 'details',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'ID',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Due Date',
		name: 'DueDate',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Sales Term',
		name: 'SalesTermRef',
		placeholder: 'Add Sales Term Fields',
		type: 'fixedCollection',
		default: {},
		options: [
			{
				displayName: 'Details',
				name: 'details',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'ID',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Total Amount',
		name: 'TotalAmt',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Transaction Date',
		name: 'TxnDate',
		type: 'dateTime',
		default: '',
	},
];
