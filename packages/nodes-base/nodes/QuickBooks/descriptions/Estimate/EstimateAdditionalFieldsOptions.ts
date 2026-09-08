import type { INodeProperties } from 'n8n-workflow';

export const estimateAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Apply tax after discount',
		name: 'ApplyTaxAfterDiscount',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Billing address',
		name: 'BillAddr',
		placeholder: 'Add billing address fields',
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
						displayName: 'Postal code',
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
						displayName: 'Country subdivision code',
						name: 'CountrySubDivisionCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Billing email',
		name: 'BillEmail',
		description: 'E-mail address to which the estimate will be sent',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Custom fields',
		name: 'CustomFields',
		placeholder: 'Add custom fields',
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
						displayName: 'Field definition name or ID',
						name: 'DefinitionId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getCustomFields',
						},
						default: '',
						description:
							'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Field value',
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
		displayName: 'Customer memo',
		name: 'CustomerMemo',
		description:
			'User-entered message to the customer. This message is visible to end user on their transactions.',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Document number',
		name: 'DocNumber',
		description: 'Reference number for the transaction',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Email status',
		name: 'EmailStatus',
		type: 'options',
		default: 'NotSet',
		options: [
			{
				name: 'Not set',
				value: 'NotSet',
			},
			{
				name: 'Need to send',
				value: 'NeedToSend',
			},
			{
				name: 'Email sent',
				value: 'EmailSent',
			},
		],
	},
	{
		displayName: 'Print status',
		name: 'PrintStatus',
		type: 'options',
		default: 'NotSet',
		options: [
			{
				name: 'Not set',
				value: 'NotSet',
			},
			{
				name: 'Need to print',
				value: 'NeedToPrint',
			},
			{
				name: 'PrintComplete',
				value: 'PrintComplete',
			},
		],
	},
	{
		displayName: 'Shipping address',
		name: 'ShipAddr',
		placeholder: 'Add shippping address fields',
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
						displayName: 'Postal code',
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
						displayName: 'Country subdivision code',
						name: 'CountrySubDivisionCode',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Total amount',
		name: 'TotalAmt',
		description: 'Total amount of the transaction',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Transaction date',
		name: 'TxnDate',
		description: 'Date when the transaction occurred',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Total tax',
		name: 'TotalTax',
		description: 'Total amount of tax incurred',
		type: 'number',
		default: 0,
	},
];
