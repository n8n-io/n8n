export const estimateAdditionalFieldsOptions = [
	{
		displayName: 'Apply Tax After Discount',
		name: 'ApplyTaxAfterDiscount',
		type: 'string',
		default: '',
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
		displayName: 'Customer Memo',
		name: 'CustomerMemo',
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
		displayName: 'Shipping Address',
		name: 'ShipAddr',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Total Amount',
		name: 'TotalAmt',
		type: 'number',
		default: '',
	},
	{
		displayName: 'Transaction Date',
		name: 'TxnDate',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Transaction Status',
		name: 'TxnStatus',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Total Tax',
		name: 'TotalTax',
		type: 'string',
		default: '',
	},
];
