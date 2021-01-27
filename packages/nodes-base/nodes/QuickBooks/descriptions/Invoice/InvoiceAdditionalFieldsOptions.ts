export const invoiceAdditionalFieldsOptions = [
	{
		displayName: 'Balance',
		name: 'Balance',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Billing Address',
		name: 'BillAddr',
		placeholder: 'Add Billing Address Fields',
		type: 'fixedCollection',
		default: {},
		options: [
			{
				displayName: 'Details',
				name: 'details',
				values: [
					{
						displayName: 'City',
						name: 'City',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Line 1',
						name: 'Line1',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Postal Code',
						name: 'PostalCode',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Latitude',
						name: 'Lat',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Longitude',
						name: 'Long',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Country Subdivision Code',
						name: 'CountrySubDivisionCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
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
		type: 'options',
		default: 'NotSet',
		options: [
			{
				name: 'Not Set',
				value: 'NotSet',
			},
			{
				name: 'Need To Send',
				value: 'NeedToSend',
			},
			{
				name: 'Email Sent',
				value: 'EmailSent',
			},
		],
	},
	{
		displayName: 'Print Status',
		name: 'PrintStatus',
		type: 'options',
		default: 'NotSet',
		options: [
			{
				name: 'Not Set',
				value: 'NotSet',
			},
			{
				name: 'Need To Print',
				value: 'NeedToPrint',
			},
			{
				name: 'PrintComplete',
				value: 'PrintComplete',
			},
		],
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
