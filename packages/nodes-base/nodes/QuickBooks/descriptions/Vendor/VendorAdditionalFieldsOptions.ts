import type { INodeProperties } from 'n8n-workflow';

export const vendorAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Account number',
		name: 'AcctNum',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Active',
		name: 'Active',
		description: 'Whether the employee is currently enabled for use by QuickBooks',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Balance',
		name: 'Balance',
		description: 'The balance reflecting any payments made against the transaction',
		type: 'number',
		default: 0,
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
		displayName: 'Company name',
		name: 'CompanyName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Family name',
		name: 'FamilyName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Given name',
		name: 'GivenName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Primary email address',
		name: 'PrimaryEmailAddr',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Primary phone',
		name: 'PrimaryPhone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Print-on-check name',
		name: 'PrintOnCheckName',
		description: 'Name of the vendor as printed on a check',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Vendor 1099',
		name: 'Vendor1099',
		description:
			'Whether the vendor is an independent contractor, given a 1099-MISC form at the end of the year',
		type: 'boolean',
		default: false,
	},
];
