import { INodeProperties } from 'n8n-workflow';

export const estimateAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Apply Tax After Discount',
		name: 'ApplyTaxAfterDiscount',
		type: 'boolean',
		default: false,
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
		description: 'E-mail address to which the estimate will be sent',
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
						displayName: 'Field Definition Name or ID',
						name: 'DefinitionId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getCustomFields',
						},
						default: '',
						description:
							'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Field Value',
						name: 'StringValue',
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
		description:
			'User-entered message to the customer. This message is visible to end user on their transactions.',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Document Number',
		name: 'DocNumber',
		description: 'Reference number for the transaction',
		type: 'string',
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
		placeholder: 'Add Shippping Address Fields',
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
		displayName: 'Total Amount',
		name: 'TotalAmt',
		description: 'Total amount of the transaction',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Transaction Date',
		name: 'TxnDate',
		description: 'Date when the transaction occurred',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Total Tax',
		name: 'TotalTax',
		description: 'Total amount of tax incurred',
		type: 'number',
		default: 0,
	},
];
