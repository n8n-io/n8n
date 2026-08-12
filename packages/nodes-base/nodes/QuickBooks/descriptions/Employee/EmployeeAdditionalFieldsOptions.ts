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
		displayName: 'Billable Time',
		name: 'BillableTime',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Display Name',
		name: 'DisplayName',
		type: 'string',
		default: '',
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
		displayName: 'Primary Phone',
		name: 'PrimaryPhone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Print-On-Check Name',
		name: 'PrintOnCheckName',
		description: 'Name of the employee as printed on a check',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Social Security Number',
		name: 'SSN',
		type: 'string',
		default: '',
	},
];
