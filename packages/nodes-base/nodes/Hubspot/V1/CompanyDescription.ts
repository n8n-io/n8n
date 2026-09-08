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
				name: 'Get many',
				value: 'getAll',
				description: 'Get many companies',
				action: 'Get many companies',
			},
			{
				name: 'Get recently created',
				value: 'getRecentlyCreated',
				description: 'Get recently created companies',
				action: 'Get a recently created company',
			},
			{
				name: 'Get recently modified',
				value: 'getRecentlyModified',
				description: 'Get recently modified companies',
				action: 'Get a recently modified company',
			},
			{
				name: 'Search by domain',
				value: 'searchByDomain',
				description: 'Search companies by domain',
				action: 'Search for a company by domain',
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
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'About us',
				name: 'aboutUs',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Annual revenue',
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
				displayName: 'Close date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description: 'The date the company or organization was closed as a customer',
			},
			{
				displayName: 'Company domain name',
				name: 'companyDomainName',
				type: 'string',
				default: '',
				description: 'The domain name of the company or organization',
			},
			{
				displayName: 'Company owner name or ID',
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
				displayName: 'Country/region',
				name: 'countryRegion',
				type: 'string',
				default: '',
				description: 'The country/region in which the company or organization is located',
			},
			{
				displayName: 'Custom properties',
				name: 'customPropertiesUi',
				placeholder: 'Add custom property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom property',
						values: [
							{
								displayName: 'Property name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCompanyProperties',
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
				displayName: 'Facebook fans',
				name: 'facebookFans',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Number of facebook fans',
			},
			{
				displayName: 'Google Plus page',
				name: 'googlePlusPage',
				type: 'string',
				default: '',
				description: 'The URL of the Google Plus page for the company or organization',
			},
			{
				displayName: 'Industry name or ID',
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
				displayName: 'Is public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether that the company is publicly traded',
			},
			{
				displayName: 'Lead status name or ID',
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
				displayName: 'Lifecycle stage name or ID',
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
				displayName: 'LinkedIn bio',
				name: 'linkedinBio',
				type: 'string',
				default: '',
				description: 'The LinkedIn bio for the company or organization',
			},
			{
				displayName: 'LinkedIn company page',
				name: 'linkedInCompanyPage',
				type: 'string',
				default: '',
				description: 'The URL of the LinkedIn company page for the company or organization',
			},
			{
				displayName: 'Number of employees',
				name: 'numberOfEmployees',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The total number of employees who work for the company or organization',
			},
			{
				displayName: 'Original source type name or ID',
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
				displayName: 'Phone number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: "A company's primary phone number. Powered by HubSpot Insights.",
			},
			{
				displayName: 'Postal code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description:
					'The postal or zip code of the company or organization. Powered by HubSpot Insights.',
			},
			{
				displayName: 'State/region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description:
					'The state or region in which the company or organization is located. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description:
					'The street address of the company or organization, including unit number. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street address 2',
				name: 'streetAddress2',
				type: 'string',
				default: '',
				description:
					'The additional address of the company or organization. Powered by HubSpot Insights.',
			},

			{
				displayName: 'Target account name or ID',
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
				displayName: 'Total money raised',
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
				displayName: 'Twitter bio',
				name: 'twitterBio',
				type: 'string',
				default: '',
				description: 'The Twitter bio of the company or organization',
			},
			{
				displayName: 'Twitter followers',
				name: 'twitterFollowers',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The number of Twitter followers of the company or organization',
			},
			{
				displayName: 'Twitter handle',
				name: 'twitterHandle',
				type: 'string',
				default: '',
				description: 'The main twitter account of the company or organization',
			},
			{
				displayName: 'Type name or ID',
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
				displayName: 'Web technologies name or ID',
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
				displayName: 'Year founded',
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
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular company',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'About us',
				name: 'aboutUs',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Annual revenue',
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
				displayName: 'Close date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
				description: 'The date the company or organization was closed as a customer',
			},
			{
				displayName: 'Company domain name',
				name: 'companyDomainName',
				type: 'string',
				default: '',
				description: 'The domain name of the company or organization',
			},
			{
				displayName: 'Company owmer name or ID',
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
				displayName: 'Country/region',
				name: 'countryRegion',
				type: 'string',
				default: '',
				description: 'The country/region in which the company or organization is located',
			},
			{
				displayName: 'Custom properties',
				name: 'customPropertiesUi',
				placeholder: 'Add custom property',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customPropertiesValues',
						displayName: 'Custom property',
						values: [
							{
								displayName: 'Property name or ID',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCompanyProperties',
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
				displayName: 'Facebook fans',
				name: 'facebookFans',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Number of facebook fans',
			},
			{
				displayName: 'Google Plus page',
				name: 'googlePlusPage',
				type: 'string',
				default: '',
				description: 'The URL of the Google Plus page for the company or organization',
			},
			{
				displayName: 'Industry name or ID',
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
				displayName: 'Is public',
				name: 'isPublic',
				type: 'boolean',
				default: false,
				description: 'Whether that the company is publicly traded',
			},
			{
				displayName: 'Lead status name or ID',
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
				displayName: 'Lifecycle stage name or ID',
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
				displayName: 'Linkedin bio',
				name: 'linkedinBio',
				type: 'string',
				default: '',
				description: 'The LinkedIn bio for the company or organization',
			},
			{
				displayName: 'LinkedIn company page',
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
				displayName: 'Number of employees',
				name: 'numberOfEmployees',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The total number of employees who work for the company or organization',
			},
			{
				displayName: 'Original source type name or ID',
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
				displayName: 'Phone number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: "A company's primary phone number. Powered by HubSpot Insights.",
			},
			{
				displayName: 'Postal code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description:
					'The postal or zip code of the company or organization. Powered by HubSpot Insights.',
			},
			{
				displayName: 'State/region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description:
					'The state or region in which the company or organization is located. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description:
					'The street address of the company or organization, including unit number. Powered by HubSpot Insights.',
			},
			{
				displayName: 'Street address 2',
				name: 'streetAddress2',
				type: 'string',
				default: '',
				description:
					'The additional address of the company or organization. Powered by HubSpot Insights.',
			},

			{
				displayName: 'Target account name or ID',
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
				displayName: 'Total money raised',
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
				displayName: 'Twitter bio',
				name: 'twitterBio',
				type: 'string',
				default: '',
				description: 'The Twitter bio of the company or organization',
			},
			{
				displayName: 'Twitter followers',
				name: 'twitterFollowers',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'The number of Twitter followers of the company or organization',
			},
			{
				displayName: 'Twitter handle',
				name: 'twitterHandle',
				type: 'string',
				default: '',
				description: 'The main twitter account of the company or organization',
			},
			{
				displayName: 'Type name or ID',
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
				displayName: 'Web technologies name or ID',
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
				displayName: 'Year founded',
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
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular company',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include merge audits',
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
		displayName: 'Return all',
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
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include merge audits',
				name: 'includeMergeAudits',
				type: 'boolean',
				default: false,
				description:
					'Whether to return any merge history if a company has been previously merged with another company record. Defaults to false.',
			},
			{
				displayName: 'Property names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanyProperties',
				},
				default: [],
				description:
					'<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your companies.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Properties with history',
				name: 'propertiesWithHistory',
				type: 'string',
				default: '',
				description:
					"Works similarly to properties=, but this parameter will include the history for the specified property, instead of just including the current value. Use this parameter when you need the full history of changes to a property's value.",
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 company:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular company',
	},

	/* -------------------------------------------------------------------------- */
	/*               company:getRecentlyCreated company:getRecentlyModifie        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getRecentlyCreated', 'getRecentlyModified'],
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
				operation: ['getRecentlyCreated', 'getRecentlyModified'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['getRecentlyModified'],
			},
		},
		options: [
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'Only return companys created after timestamp x',
			},
			{
				displayName: 'Include property versions',
				name: 'includePropertyVersions',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default, you will only get data for the most recent version of a property in the "versions" data. If you include this parameter, you will get data for all previous versions.',
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
		description: "The company's website domain to search for, like n8n.io",
		default: '',
	},
	{
		displayName: 'Return all',
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
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['searchByDomain'],
			},
		},
		options: [
			{
				displayName: 'Property names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCompanyProperties',
				},
				default: [],
				description:
					'<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];
