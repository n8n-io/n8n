export const customerAdditionalFieldsOptions = [
	{
		displayName: 'Active',
		name: 'Active',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Balance',
		name: 'Balance',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Balance With Jobs',
		name: 'BalanceWithJobs',
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
		displayName: 'Bill With Parent',
		name: 'BillWithParent',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Company Name',
		name: 'CompanyName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Family Name',
		name: 'FamilyName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Fully Qualified Name',
		name: 'FullyQualifiedName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Given Name',
		name: 'GivenName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Preferred Delivery Method',
		name: 'PreferredDeliveryMethod',
		type: 'options',
		default: 'Print',
		options: [
			{
				name: 'Print',
				value: 'Print',
			},
			{
				name: 'Email',
				value: 'Email',
			},
			{
				name: 'None',
				value: 'None',
			},
		],
	},
	{
		displayName: 'Primary Email Address',
		name: 'PrimaryEmailAddr',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Primary Phone',
		name: 'PrimaryPhone',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Print on Check Name',
		name: 'PrintOnCheckName',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Taxable',
		name: 'Taxable',
		type: 'boolean',
		default: false,
	},
];
