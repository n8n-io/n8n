export const billAdditionalFieldsOptions = [
	{
		displayName: 'Accounts Receivable Account',
		name: 'ARAccountRef',
		placeholder: 'Add ARA Fields',
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
						displayName: 'Value',
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
		type: 'string',
		default: '',
	},
	{
		displayName: 'Due Date',
		name: 'DueDate',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Sales Term',
		name: 'SalesTermRef',
		type: 'string',
		default: '',
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
		type: 'string',
		default: '',
	},
];
