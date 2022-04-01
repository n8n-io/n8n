import {
	INodeProperties
} from 'n8n-workflow';

export const billAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Accounts Payable Account',
		name: 'APAccountRef',
		placeholder: 'Add APA Fields',
		description: 'Accounts Payable account to which the bill will be credited.',
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
		description: 'The balance reflecting any payments made against the transaction.',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Due Date',
		name: 'DueDate',
		description: 'Date when the payment of the transaction is due.',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Sales Term',
		name: 'SalesTermRef',
		description: 'Sales term associated with the transaction.',
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
		description: 'Total amount of the transaction.',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Transaction Date',
		name: 'TxnDate',
		description: 'Date when the transaction occurred.',
		type: 'dateTime',
		default: '',
	},
];
