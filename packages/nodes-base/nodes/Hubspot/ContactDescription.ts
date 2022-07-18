import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create or Update',
				value: 'upsert',
				description: 'Create a new contact, or update the current one if it already exists (upsert)',
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
				action: 'Get all contacts',
			},
			{
				name: 'Get Recently Created/Updated',
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
				resource: [
					'contact',
				],
				operation: [
					'upsert',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'upsert',
				],
			},
		},
		default: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: 'By default the response only includes the ID. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'upsert',
				],
			},
		},
		options: [
			{
				displayName: 'Annual Revenue',
				name: 'annualRevenue',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Associated Company Name or ID',
				name: 'associatedCompanyId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCompanies',
				},
				default: '',
				description: 'Companies associated with the ticket. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Clicked Facebook Ad',
				name: 'clickedFacebookAd',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Close Date',
				name: 'closeDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company Size',
				name: 'companySize',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Contact Owner Name or ID',
				name: 'contactOwner',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getOwners',
				},
				default: '',
			},
			{
				displayName: 'Country/Region',
				name: 'country',
				type: 'string',
				default: '',
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
									loadOptionsMethod: 'getContactCustomProperties',
								},
								default: '',
								description: 'Name of the property. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Date of Birth',
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
				displayName: 'Facebook Click ID',
				name: 'facebookClickId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Fax Number',
				name: 'faxNumber',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Field Of Study',
				name: 'fieldOfStudy',
				type: 'string',
				default: '',
				description: 'A contact\'s field of study. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'A contact\'s first name',
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Google Ad Click ID',
				name: 'googleAdClickId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Graduation Date',
				name: 'graduationDate',
				type: 'dateTime',
				default: '',
				description: 'A contact\'s graduation date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
			},
			{
				displayName: 'Industry',
				name: 'industry',
				type: 'string',
				default: '',
				description: 'The industry a contact is in',
			},
			{
				displayName: 'Job Function',
				name: 'jobFunction',
				type: 'string',
				default: '',
				description: 'A contact\'s job function. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'A contact\'s job title',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'A contact\'s last name',
			},
			{
				displayName: 'Lead Status Name or ID',
				name: 'leadStatus',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLeadStatuses',
				},
				default: '',
				description: 'The contact\'s sales, prospecting or outreach status. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Legal Basic For Processing Contact Data Name or ID',
				name: 'processingContactData',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLealBasics',
				},
				default: '',
				description: 'Legal basis for processing contact\'s data; \'Not applicable\' will exempt the contact from GDPR protections. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Lifecycle Stage Name or ID',
				name: 'lifeCycleStage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactLifeCycleStages',
				},
				default: '',
				description: 'The qualification of contacts to sales readiness. It can be set through imports, forms, workflows, and manually on a per contact basis. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Marital Status',
				name: 'maritalStatus',
				type: 'string',
				default: '',
				description: 'A contact\'s marital status. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
			},
			{
				displayName: 'Membership Note',
				name: 'membershipNote',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The notes relating to the contact\'s content membership',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'A default property to be used for any message or comments a contact may want to leave on a form',
			},
			{
				displayName: 'Mobile Phone Number',
				name: 'mobilePhoneNumber',
				type: 'string',
				default: '',
				description: 'A contact\'s mobile phone number',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Number Of Employees',
				name: 'numberOfEmployees',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactNumberOfEmployees',
				},
				default: '',
				description: 'The number of company employees. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Original Source Name or ID',
				name: 'originalSource',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactOriginalSources',
				},
				default: '',
				description: 'The first known source through which a contact found your website. Source is automatically set by HubSpot, but may be updated manually. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: 'A contact\'s primary phone number',
			},
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				displayOptions: {
					show: {
						'/resolveData': [
							true,
						],
					},
				},
				default: [],
				description: '<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: 'The contact\'s zip code. This might be set via import, form, or integration.',
			},
			{
				displayName: 'Preffered Language Name or ID',
				name: 'prefferedLanguage',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactPrefferedLanguages',
				},
				default: '',
				description: 'Set your contact\'s preferred language for communications. This property can be changed from an import, form, or integration. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Relationship Status',
				name: 'relationshipStatus',
				type: 'string',
				default: '',
				description: 'A contact\'s relationship status. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
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
				description: 'A contact\'s school. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
			},
			{
				displayName: 'Seniority',
				name: 'seniority',
				type: 'string',
				default: '',
				description: 'A contact\'s seniority. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'A contact\'s start date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
			},
			{
				displayName: 'State/Region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description: 'The contact\'s state of residence. This might be set via import, form, or integration.',
			},
			{
				displayName: 'Status Name or ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getContactStatuses',
				},
				default: '',
				description: 'The status of the contact\'s content membership. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Street Address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description: 'A contact\'s street address, including apartment or unit #',
			},
			{
				displayName: 'Twitter Username',
				name: 'twitterUsername',
				type: 'string',
				default: '',
				description: 'The contact\'s Twitter handle. This is set by HubSpot using the contact\'s email address.',
			},
			{
				displayName: 'Website URL',
				name: 'websiteUrl',
				type: 'string',
				default: '',
				description: 'The contact\'s company website',
			},
			{
				displayName: 'Work Email',
				name: 'workEmail',
				type: 'string',
				default: '',
				description: 'A contact\'s work email. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool',
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
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Form Submission Mode',
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
				displayName: 'List Memberships',
				name: 'listMerberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: [],
				description: '<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Property Mode',
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
				description: 'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Form Submission Mode',
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
				displayName: 'List Memberships',
				name: 'listMerberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: [],
				description: '<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Property Mode',
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
				description: 'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
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
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},

	/* -------------------------------------------------------------------------- */
	/*               contact:getRecentlyCreatedUpdated                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getRecentlyCreatedUpdated',
				],
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
				resource: [
					'contact',
				],
				operation: [
					'getRecentlyCreatedUpdated',
				],
				returnAll: [
					false,
				],
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
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getRecentlyCreatedUpdated',
				],
			},
		},
		options: [
			{
				displayName: 'Form Submission Mode',
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
				displayName: 'List Memberships',
				name: 'listMerberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Property Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: [],
				description: '<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Property Mode',
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
				description: 'Specify if the current value for a property should be fetched, or the value and all the historical values for that property',
			},
		],
	},

	//*-------------------------------------------------------------------------- */
	/*                                 contact:search                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'search',
				],
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
				resource: [
					'contact',
				],
				operation: [
					'search',
				],
				returnAll: [
					false,
				],
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
		displayName: 'Filter Groups',
		name: 'filterGroupsUi',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Filter Group',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'search',
				],
			},
		},
		options: [
			{
				name: 'filterGroupsValues',
				displayName: 'Filter Group',
				values: [
					{
						displayName: 'Filters',
						name: 'filtersUi',
						type: 'fixedCollection',
						default: {},
						placeholder: 'Add Filter',
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'filterValues',
								displayName: 'Filter',
								values: [
									{
										displayName: 'Property Name or ID',
										name: 'propertyName',
										type: 'options',
										description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
												name: 'Contains Exactly',
												value: 'CONTAINS_TOKEN',
											},
											{
												name: 'Equal',
												value: 'EQ',
											},
											{
												name: 'Greater Than',
												value: 'GT',
											},
											{
												name: 'Greater Than Or Equal',
												value: 'GTE',
											},
											{
												name: 'Is Known',
												value: 'HAS_PROPERTY',
											},
											{
												name: 'Is Unknown',
												value: 'NOT_HAS_PROPERTY',
											},
											{
												name: 'Less Than',
												value: 'LT',
											},
											{
												name: 'Less Than Or Equal',
												value: 'LTE',
											},
											{
												name: 'Not Equal',
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
												operator: [
													'HAS_PROPERTY',
													'NOT_HAS_PROPERTY',
												],
											},
										},
										type: 'string',
										default: '',
									},
								],
							},
						],
						description: 'Use filters to limit the results to only CRM objects with matching property values. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>.',
					},
				],
			},
		],
		description: 'When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'search',
				],
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
				description: 'Defines the direction in which search results are ordered. Default value is DESC.',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: [
					'firstname',
					'lastname',
					'email',
				],
				description: '<p>Used to include specific company properties in the results. By default, the results will only include company ID and will not include the values for any properties for your company.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: 'createdate',
			},
		],
	},
];
