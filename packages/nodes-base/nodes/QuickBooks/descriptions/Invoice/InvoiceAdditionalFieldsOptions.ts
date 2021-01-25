export const invoiceAdditionalFieldsOptions = [
	{
		displayName: 'Apply Tax After Discount',
		name: 'ApplyTaxAfterDiscount',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Balance',
		name: 'Balance',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Billing Address',
		name: 'BillAddr',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Billing Email',
		name: 'BillEmail',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Customer Memo',
		name: 'CustomerMemo',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Custom Fields',
		name: 'CustomFields',
		placeholder: 'Add Custom Fields',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'Field',
				values: [
					{
						displayName: 'Field Definition ID',
						name: 'DefinitionID',
						type: 'string',
						default: '',
						description: 'ID of the field to set',
					},
					{
						displayName: 'Field Name',
						name: 'Name',
						type: 'string',
						default: '',
						description: 'Value of the field to set',
					},
				],
			},
		],
	},
	{
		displayName: 'Deposit',
		name: 'Deposit',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Document Number',
		name: 'DocNumber',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Due Date',
		name: 'DueDate',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Email Status',
		name: 'EmailStatus',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Print Status',
		name: 'PrintStatus',
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
		displayName: 'Shipping Address',
		name: 'ShipAddr',
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
		type: 'dateTime',
		default: '',
	},
];
