import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create or update',
				value: 'upsert',
				description:
					'Create a new contact, or update the current one if it already exists (upsert)',
				action: 'Create or update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many contacts',
				action: 'Get many contacts',
			},
			{
				name: 'Get recently created/updated',
				value: 'getRecentlyCreatedUpdated',
				description: 'Get recently created/updated contacts',
				action: 'Get recently created/updated contacts',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search contacts',
				action: 'Search contacts',
			},
		],
		default: 'upsert',
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                contact:upsert                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		default: '',
	},
	{
		displayName: 'Resolve data',
		name: 'resolveData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		default: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description:
			'By default the response only includes the ID. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				displayName: 'Annual revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Associated company name or ID',
				name: 'associatedCompanyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: '',
				description:
					'Companies associated with the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Clicked Facebook ad',
				name: 'clickedFacebookAd',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Close date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Company name',
				name: 'companyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company size',
				name: 'companySize',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Contact owner name or ID',
				name: 'contactOwner',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
			},
			{
				displayName: 'Country/region',
				name: 'country',
				type: 'string',
				default: '',
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
									loadOptionsMethod: 'getContactProperties',
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
				displayName: 'Date of birth',
				name: 'dateOfBirth',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Degree',
				name: 'degree',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Facebook click ID',
				name: 'facebookClickId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax number',
				name: 'faxNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Field of study',
				name: 'fieldOfStudy',
				type: 'string',
				default: '',
				description:
					"A contact's field of study. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'First name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: "A contact's first name",
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Google ad click ID',
				name: 'googleAdClickId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Graduation date',
				name: 'graduationDate',
				type: 'dateTime',
				default: '',
				description:
					"A contact's graduation date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'The industry a contact is in',
			},
			{
				displayName: 'Job function',
				name: 'jobFunction',
				type: 'string',
				default: '',
				description:
					"A contact's job function. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Job title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: "A contact's job title",
			},
			{
				displayName: 'Last name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: "A contact's last name",
			},
			{
				displayName: 'Lead status name or ID',
				name: 'leadStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLeadStatuses',
				},
				default: '',
				description:
					'The contact\'s sales, prospecting or outreach status. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Legal basic for processing contact data name or ID',
				name: 'processingContactData',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLealBasics',
				},
				default: '',
				description:
					"Legal basis for processing contact's data; 'Not applicable' will exempt the contact from GDPR protections. Choose from the list, or specify an ID using an <a href=\"https://docs.n8n.io/code/expressions/\">expression</a>.",
			},
			{
				displayName: 'Lifecycle stage name or ID',
				name: 'lifeCycleStage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLifeCycleStages',
				},
				default: '',
				description:
					'The qualification of contacts to sales readiness. It can be set through imports, forms, workflows, and manually on a per contact basis. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Marital status',
				name: 'maritalStatus',
				type: 'string',
				default: '',
				description:
					"A contact's marital status. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Membership note',
				name: 'membershipNote',
				type: 'string',
				default: '',
				description: "The notes relating to the contact's content membership",
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description:
					'A default property to be used for any message or comments a contact may want to leave on a form',
			},
			{
				displayName: 'Mobile phone number',
				name: 'mobilePhoneNumber',
				type: 'string',
				default: '',
				description: "A contact's mobile phone number",
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Number of employees',
				name: 'numberOfEmployees',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactNumberOfEmployees',
				},
				default: '',
				description:
					'The number of company employees. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Original source name or ID',
				name: 'originalSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactOriginalSources',
				},
				default: '',
				description:
					'The first known source through which a contact found your website. Source is automatically set by HubSpot, but may be updated manually. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: "A contact's primary phone number",
			},
			{
				displayName: 'Property names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				displayOptions: {
					show: {
						'/resolveData': [true],
					},
				},
				default: [],
				description:
					'<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Postal code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: "The contact's zip code. This might be set via import, form, or integration.",
			},
			{
				displayName: 'Preffered language name or ID',
				name: 'prefferedLanguage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactPrefferedLanguages',
				},
				default: '',
				description:
					'Set your contact\'s preferred language for communications. This property can be changed from an import, form, or integration. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Relationship status',
				name: 'relationshipStatus',
				type: 'string',
				default: '',
				description:
					"A contact's relationship status. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Salutation',
				name: 'salutation',
				type: 'string',
				default: '',
				description: 'The title used to address a contact',
			},
			{
				displayName: 'School',
				name: 'school',
				type: 'string',
				default: '',
				description:
					"A contact's school. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Seniority',
				name: 'seniority',
				type: 'string',
				default: '',
				description:
					"A contact's seniority. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Start date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description:
					"A contact's start date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'State/region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description:
					"The contact's state of residence. This might be set via import, form, or integration.",
			},
			{
				displayName: 'Status name or ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactStatuses',
				},
				default: '',
				description:
					'The status of the contact\'s content membership. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Street address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description: "A contact's street address, including apartment or unit #",
			},
			{
				displayName: 'Twitter username',
				name: 'twitterUsername',
				type: 'string',
				default: '',
				description:
					"The contact's Twitter handle. This is set by HubSpot using the contact's email address.",
			},
			{
				displayName: 'Website URL',
				name: 'websiteUrl',
				type: 'string',
				default: '',
				description: "The contact's company website",
			},
			{
				displayName: 'Work email',
				name: 'workEmail',
				type: 'string',
				default: '',
				description:
					"A contact's work email. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Form submission mode',
				name: 'formSubmissionMode',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Newest',
						value: 'newest',
					},
					{
						name: 'Oldest',
						value: 'oldest',
					},
				],
				default: 'all',
				description: 'Specify which form submissions should be fetched',
			},
			{
				displayName: 'List memberships',
				name: 'listMemberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Property names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: [],
				description:
					'<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Property mode',
				name: 'propertyMode',
				type: 'options',
				options: [
					{
						name: 'Value and history',
						value: 'valueAndHistory',
					},
					{
						name: 'Value only',
						value: 'valueOnly',
					},
				],
				default: 'valueAndHistory',
				description:
					'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
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
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Form submission mode',
				name: 'formSubmissionMode',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Newest',
						value: 'newest',
					},
					{
						name: 'Oldest',
						value: 'oldest',
					},
				],
				default: 'all',
				description: 'Specify which form submissions should be fetched',
			},
			{
				displayName: 'List memberships',
				name: 'listMemberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Property names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: [],
				description:
					'<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Property mode',
				name: 'propertyMode',
				type: 'options',
				options: [
					{
						name: 'Value and history',
						value: 'valueAndHistory',
					},
					{
						name: 'Value only',
						value: 'valueOnly',
					},
				],
				default: 'valueAndHistory',
				description:
					'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},

	/* -------------------------------------------------------------------------- */
	/*               contact:getRecentlyCreatedUpdated                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
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
				resource: ['contact'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getRecentlyCreatedUpdated'],
			},
		},
		options: [
			{
				displayName: 'Form submission mode',
				name: 'formSubmissionMode',
				type: 'options',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Newest',
						value: 'newest',
					},
					{
						name: 'Oldest',
						value: 'oldest',
					},
				],
				default: 'all',
				description: 'Specify which form submissions should be fetched',
			},
			{
				displayName: 'List memberships',
				name: 'listMemberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Property names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: [],
				description:
					'<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Property mode',
				name: 'propertyMode',
				type: 'options',
				options: [
					{
						name: 'Value and history',
						value: 'valueAndHistory',
					},
					{
						name: 'Value only',
						value: 'valueOnly',
					},
				],
				default: 'valueAndHistory',
				description:
					'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
			},
		],
	},

	//*-------------------------------------------------------------------------- */
	/*                                 contact:search                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
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
				resource: ['contact'],
				operation: ['search'],
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
		displayName: 'Filter groups',
		name: 'filterGroupsUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add filter group',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
		options: [
			{
				name: 'filterGroupsValues',
				displayName: 'Filter group',
				values: [
					{
						displayName: 'Filters',
						name: 'filtersUi',
						type: 'fixedCollection',
						default: {},
						placeholder: 'Add filter',
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'filterValues',
								displayName: 'Filter',
								values: [
									{
										displayName: 'Property name or ID',
										name: 'propertyName',
										type: 'options',
										description:
											'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
										typeOptions: {
											loadOptionsMethod: 'getContactProperties',
										},
										default: '',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										options: [
											{
												name: 'Contains exactly',
												value: 'CONTAINS_TOKEN',
											},
											{
												name: 'Equal',
												value: 'EQ',
											},
											{
												name: 'Greater than',
												value: 'GT',
											},
											{
												name: 'Greater than or equal',
												value: 'GTE',
											},
											{
												name: 'Is known',
												value: 'HAS_PROPERTY',
											},
											{
												name: 'Is unknown',
												value: 'NOT_HAS_PROPERTY',
											},
											{
												name: 'Less than',
												value: 'LT',
											},
											{
												name: 'Less than or equal',
												value: 'LTE',
											},
											{
												name: 'Not equal',
												value: 'NEQ',
											},
										],
										default: 'EQ',
									},
									{
										displayName: 'Value',
										name: 'value',
										displayOptions: {
											hide: {
												operator: ['HAS_PROPERTY', 'NOT_HAS_PROPERTY'],
											},
										},
										type: 'string',
										default: '',
									},
								],
							},
						],
						description:
							'Use filters to limit the results to only CRM objects with matching property values. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>.',
					},
				],
			},
		],
		description:
			'When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'ASCENDING',
					},
					{
						name: 'DESC',
						value: 'DESCENDING',
					},
				],
				default: 'DESCENDING',
				description:
					'Defines the direction in which search results are ordered. Default value is DESC.',
			},
			{
				displayName: 'Field names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: ['firstname', 'lastname', 'email'],
				description:
					'<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Perform a text search against all property values for an object type',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Sort by',
				name: 'sortBy',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: 'createdate',
			},
		],
	},
];
