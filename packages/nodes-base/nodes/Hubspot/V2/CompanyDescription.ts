import type { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['company'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a company',
				action: 'Create a company',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company',
				action: 'Delete a company',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a company',
				action: 'Get a company',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many companies',
				action: 'Get many companies',
			},
			{
				name: 'Get Recently Created/Updated',
				value: 'getRecentlyCreatedUpdated',
				description: 'Get recently created/updated companies',
				action: 'Get recently created/updated companies',
			},
			{
				name: 'Search',
				value: 'searchByDomain',
				description: 'Search companies by their website domain',
				action: 'Search for a company by Domain',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company',
				action: 'Update a company',
			},
		],
		default: 'create',
	},
];

export const companyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                company:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		default: '',
	},
	{
		displayName: 'Company Properties',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Property',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'About Us',
				name: 'aboutUs',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The actual or estimated annual revenue of the company',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'The city where the company is located',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description:
					'The date the company or organization was closed as a customer. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Company Domain Name',
				name: 'companyDomainName',
				type: 'string',
				default: '',
				description: 'The domain name of the company or organization',
			},
			{
				displayName: 'Company Owner Name or ID',
				name: 'companyOwner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
				description:
					'The owner of the company. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Country/Region',
				name: 'countryRegion',
				type: 'string',
				default: '',
				description: 'The country/region in which the company or organization is located',
			},
			{
				displayName: 'Custom Properties',
				name: 'customPropertiesUi',
				placeholder: 'Add Custom Property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom Property',
						values: [
							{
								displayName: 'Property Name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCompanyCustomProperties',
								},
								default: {},
								description:
									'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								required: true,
								description: 'Value of the property',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: "A short statement about the company's mission and goals",
			},
			{
				displayName: 'Facebook Fans',
				name: 'facebookFans',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Number of facebook fans',
			},
			{
				displayName: 'Google Plus Page',
				name: 'googlePlusPage',
				type: 'string',
				default: '',
				description: 'The URL of the Google Plus page for the company or organization',
			},
			{
				displayName: 'Industry Name or ID',
				name: 'industry',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyIndustries',
				},
				default: '',
				description:
					'The type of business the company performs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether that the company is publicly traded',
			},
			{
				displayName: 'Lead Status Name or ID',
				name: 'leadStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyleadStatuses',
				},
				default: '',
				description:
					'The company\'s sales, prospecting or outreach status. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Lifecycle Stage Name or ID',
				name: 'lifecycleStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanylifecycleStages',
				},
				default: '',
				description:
					'The most advanced lifecycle stage across all contacts associated with this company or organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'LinkedIn Bio',
				name: 'linkedinBio',
				type: 'string',
				default: '',
				description: 'The LinkedIn bio for the company or organization',
			},
			{
				displayName: 'LinkedIn Company Page',
				name: 'linkedInCompanyPage',
				type: 'string',
				default: '',
				description: 'The URL of the LinkedIn company page for the company or organization',
			},
			{
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The total number of employees who work for the company or organization',
			},
			{
				displayName: 'Original Source Type Name or ID',
				name: 'originalSourceType',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanySourceTypes',
				},
				default: '',
				description:
					'Original source for the contact with the earliest activity for this company or organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: "A company's primary phone number. Powered by HubSpot Insights.",
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description:
					'The postal or zip code of the company or organization. Powered by HubSpot Insights.',
			},
			{
				displayName: 'State/Region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description:
					'The state or region in which the company or organization is located. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street Address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description:
					'The street address of the company or organization, including unit number. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street Address 2',
				name: 'streetAddress2',
				type: 'string',
				default: '',
				description:
					'The additional address of the company or organization. Powered by HubSpot Insights.',
			},

			{
				displayName: 'Target Account Name or ID',
				name: 'targetAccount',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyTargetAccounts',
				},
				default: '',
				description:
					'The Target Account property is a means to flag high priority companies if you are following an account based strategy. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description:
					'The time zone where the company or organization is located. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Total Money Raised',
				name: 'totalMoneyRaised',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description:
					'The total amount of money raised by the company. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Twitter Bio',
				name: 'twitterBio',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The Twitter bio of the company or organization',
			},
			{
				displayName: 'Twitter Followers',
				name: 'twitterFollowers',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The number of Twitter followers of the company or organization',
			},
			{
				displayName: 'Twitter Handle',
				name: 'twitterHandle',
				type: 'string',
				default: '',
				description: 'The main twitter account of the company or organization',
			},
			{
				displayName: 'Type Name or ID',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyTypes',
				},
				default: '',
				description:
					'The optional classification of this company record - prospect, partner, etc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Web Technologies Name or ID',
				name: 'webTechnologies',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyWebTechnologies',
				},
				default: '',
				description:
					'The web technologies used by the company or organization. Powered by HubSpot Insights. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Website URL',
				name: 'websiteUrl',
				type: 'string',
				default: '',
				description:
					'The main website of the company or organization. This property is used to identify unique companies. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Year Founded',
				name: 'yearFounded',
				type: 'string',
				default: '',
				description: 'The year the company was created. Powered by HubSpot Insights.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 company:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company to Update',
		name: 'companyId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchCompanies',
				},
			},
			{
				displayName: 'By Id',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Company ID',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'About Us',
				name: 'aboutUs',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The actual or estimated annual revenue of the company',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
				description: 'The city where the company is located',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description:
					'The date the company or organization was closed as a customer. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Company Domain Name',
				name: 'companyDomainName',
				type: 'string',
				default: '',
				description: 'The domain name of the company or organization',
			},
			{
				displayName: 'Company Owner Name or ID',
				name: 'companyOwner',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
				description:
					'The owner of the company. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Country/Region',
				name: 'countryRegion',
				type: 'string',
				default: '',
				description: 'The country/region in which the company or organization is located',
			},
			{
				displayName: 'Custom Properties',
				name: 'customPropertiesUi',
				placeholder: 'Add Custom Property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom Property',
						values: [
							{
								displayName: 'Property Name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCompanyCustomProperties',
								},
								default: '',
								description:
									'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								required: true,
								description: 'Value of the property',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: "A short statement about the company's mission and goals",
			},
			{
				displayName: 'Facebook Fans',
				name: 'facebookFans',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Number of facebook fans',
			},
			{
				displayName: 'Google Plus Page',
				name: 'googlePlusPage',
				type: 'string',
				default: '',
				description: 'The URL of the Google Plus page for the company or organization',
			},
			{
				displayName: 'Industry Name or ID',
				name: 'industry',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyIndustries',
				},
				default: '',
				description:
					'The type of business the company performs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether that the company is publicly traded',
			},
			{
				displayName: 'Lead Status Name or ID',
				name: 'leadStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyleadStatuses',
				},
				default: '',
				description:
					'The company\'s sales, prospecting or outreach status. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Lifecycle Stage Name or ID',
				name: 'lifecycleStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanylifecycleStages',
				},
				default: '',
				description:
					'The most advanced lifecycle stage across all contacts associated with this company or organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Linkedin Bio',
				name: 'linkedinBio',
				type: 'string',
				default: '',
				description: 'The LinkedIn bio for the company or organization',
			},
			{
				displayName: 'LinkedIn Company Page',
				name: 'linkedInCompanyPage',
				type: 'string',
				default: '',
				description: 'The URL of the LinkedIn company page for the company or organization',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The total number of employees who work for the company or organization',
			},
			{
				displayName: 'Original Source Type Name or ID',
				name: 'originalSourceType',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanySourceTypes',
				},
				default: '',
				description:
					'Original source for the contact with the earliest activity for this company or organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: "A company's primary phone number. Powered by HubSpot Insights.",
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description:
					'The postal or zip code of the company or organization. Powered by HubSpot Insights.',
			},
			{
				displayName: 'State/Region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description:
					'The state or region in which the company or organization is located. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street Address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description:
					'The street address of the company or organization, including unit number. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street Address 2',
				name: 'streetAddress2',
				type: 'string',
				default: '',
				description:
					'The additional address of the company or organization. Powered by HubSpot Insights.',
			},

			{
				displayName: 'Target Account Name or ID',
				name: 'targetAccount',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyTargetAccounts',
				},
				default: '',
				description:
					'The Target Account property is a means to flag high priority companies if you are following an account based strategy. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description:
					'The time zone where the company or organization is located. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Total Money Raised',
				name: 'totalMoneyRaised',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description:
					'The total amount of money raised by the company. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Twitter Bio',
				name: 'twitterBio',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The Twitter bio of the company or organization',
			},
			{
				displayName: 'Twitter Followers',
				name: 'twitterFollowers',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The number of Twitter followers of the company or organization',
			},
			{
				displayName: 'Twitter Handle',
				name: 'twitterHandle',
				type: 'string',
				default: '',
				description: 'The main twitter account of the company or organization',
			},
			{
				displayName: 'Type Name or ID',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyTypes',
				},
				default: '',
				description:
					'The optional classification of this company record - prospect, partner, etc. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Web Technologies Name or ID',
				name: 'webTechnologies',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanyWebTechnologies',
				},
				default: '',
				description:
					'The web technologies used by the company or organization. Powered by HubSpot Insights. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Website URL',
				name: 'websiteUrl',
				type: 'string',
				default: '',
				description:
					'The main website of the company or organization. This property is used to identify unique companies. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Year Founded',
				name: 'yearFounded',
				type: 'string',
				default: '',
				description: 'The year the company was created. Powered by HubSpot Insights.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  company:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company to Get',
		name: 'companyId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchCompanies',
				},
			},
			{
				displayName: 'By Id',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Company ID',
						},
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include Merge Audits',
				name: 'includeMergeAudits',
				type: 'boolean',
				default: false,
				description:
					'Whether to return any merge history if the company has been previously merged with another company record. Defaults to false.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 company:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include Merge Audits',
				name: 'includeMergeAudits',
				type: 'boolean',
				default: false,
				description:
					'Whether to return any merge history if a company has been previously merged with another company record. Defaults to false.',
			},
			{
				displayName: 'Company Properties to Include',
				name: 'propertiesCollection',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'propertiesValues',
						displayName: 'Companies Properties to Include',
						values: [
							{
								displayName: 'Companies Properties to Include',
								name: 'properties',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getCompanyProperties',
								},
								default: [],
								description:
									'Whether to include specific Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Include',
								name: 'propertyMode',
								type: 'options',
								options: [
									{
										name: 'Value And History',
										value: 'valueAndHistory',
									},
									{
										name: 'Value Only',
										value: 'valueOnly',
									},
								],
								default: 'valueAndHistory',
								description:
									'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
							},
						],
					},
				],
				description:
					'Whether to include specific Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 company:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company to Delete',
		name: 'companyId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['delete'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select from the list',
				typeOptions: {
					searchListMethod: 'searchCompanies',
				},
			},
			{
				displayName: 'By Id',
				name: 'id',
				type: 'string',
				placeholder: '58539222',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]+',
							errorMessage: 'Not a valid HubSpot Company ID',
						},
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*              getRecentlyCreatedUpdate                                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getRecentlyCreatedUpdated'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getRecentlyCreatedUpdated'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getRecentlyCreatedUpdated'],
			},
		},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description:
					'Only return companys created after timestamp x. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format.',
			},
			{
				displayName: 'Company Properties to Include',
				name: 'propertiesCollection',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'propertiesValues',
						displayName: 'Companies Properties to Include',
						values: [
							{
								displayName: 'Companies Properties to Include',
								name: 'properties',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getCompanyProperties',
								},
								default: [],
								description:
									'Whether to include specific Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Include',
								name: 'propertyMode',
								type: 'options',
								options: [
									{
										name: 'Value And History',
										value: 'valueAndHistory',
									},
									{
										name: 'Value Only',
										value: 'valueOnly',
									},
								],
								default: 'valueAndHistory',
								description:
									'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
							},
						],
					},
				],
				description:
					'Whether to include specific Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                            company:searchByDomain                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['searchByDomain'],
			},
		},
		required: true,
		default: '',
		description: "The company's website domain to search for, like n8n.io",
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['searchByDomain'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['searchByDomain'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['searchByDomain'],
			},
		},
		options: [
			{
				displayName: 'Company Properties to Include',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanyProperties',
				},
				default: [],
				description:
					'Whether to include specific Company properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];
