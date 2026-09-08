import type { INodeProperties } from 'n8n-workflow';

export const employeeAdditionalFieldsOptions: INodeProperties[] = [
	{
		displayName: 'Active',
		name: 'Active',
		description: 'Whether the employee is currently enabled for use by QuickBooks',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Billable time',
		name: 'BillableTime',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Display name',
		name: 'DisplayName',
		type: 'string',
		default: '',
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
		displayName: 'Primary phone',
		name: 'PrimaryPhone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Print-on-check name',
		name: 'PrintOnCheckName',
		description: 'Name of the employee as printed on a check',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Social security number',
		name: 'SSN',
		type: 'string',
		default: '',
	},
];
