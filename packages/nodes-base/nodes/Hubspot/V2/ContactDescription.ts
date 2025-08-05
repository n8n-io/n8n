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
				name: 'Create or Update',
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
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many contacts',
				action: 'Get many contacts',
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
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		default: '',
	},
	{
		displayName: 'Contact Properties',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Property',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
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
				description:
					'When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format',
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
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
				displayName: 'Date of Birth',
				name: 'dateOfBirth',
				type: 'dateTime',
				default: '',
				description:
					'When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format',
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
				type: 'number',
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
				description:
					"A contact's field of study. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'First Name',
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
				displayName: 'Google Ad Click ID',
				name: 'googleAdClickId',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Graduation Date',
				name: 'graduationDate',
				type: 'dateTime',
				default: '',
				description:
					"A contact's graduation date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format",
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
				description:
					"A contact's job function. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: "A contact's job title",
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: "A contact's last name",
			},
			{
				displayName: 'Lead Status Name or ID',
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
				displayName: 'Legal Basic For Processing Contact Data Name or ID',
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
				displayName: 'Lifecycle Stage Name or ID',
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
				displayName: 'Marital Status',
				name: 'maritalStatus',
				type: 'string',
				default: '',
				description:
					"A contact's marital status. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Membership Note',
				name: 'membershipNote',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: "The notes relating to the contact's content membership",
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description:
					'A default property to be used for any message or comments a contact may want to leave on a form',
			},
			{
				displayName: 'Mobile Phone Number',
				name: 'mobilePhoneNumber',
				type: 'string',
				default: '',
				description: "A contact's mobile phone number",
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
				description:
					'The number of company employees. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Original Source Name or ID',
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
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: "A contact's primary phone number",
			},
			{
				displayName: 'Contact Properties to Include',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				displayOptions: {
					show: {
						'/resolveData': [false],
					},
				},
				default: [],
				description:
					'Whether to include specific Contact properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Postal Code',
				name: 'postalCode',
				type: 'string',
				default: '',
				description: "The contact's zip code. This might be set via import, form, or integration.",
			},
			{
				displayName: 'Preffered Language Name or ID',
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
				displayName: 'Relationship Status',
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
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description:
					"A contact's start date. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool. When using expressions, the time should be specified in YYYY-MM-DD hh-mm-ss format",
			},
			{
				displayName: 'State/Region',
				name: 'stateRegion',
				type: 'string',
				default: '',
				description:
					"The contact's state of residence. This might be set via import, form, or integration.",
			},
			{
				displayName: 'Status Name or ID',
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
				displayName: 'Street Address',
				name: 'streetAddress',
				type: 'string',
				default: '',
				description: "A contact's street address, including apartment or unit #",
			},
			{
				displayName: 'Twitter Username',
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
				displayName: 'Work Email',
				name: 'workEmail',
				type: 'string',
				default: '',
				description:
					"A contact's work email. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
			},
			{
				displayName: 'Buying Role',
				name: 'buyingRole',
				description:
					'Role the contact plays during the sales process. Contacts can have multiple roles, and can share roles with others.',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Blocker',
						value: 'BLOCKER',
					},
					{
						name: 'Budget Holder',
						value: 'BUDGET_HOLDER',
					},
					{
						name: 'Champion',
						value: 'CHAMPION',
					},
					{
						name: 'Decision Maker',
						value: 'DECISION_MAKER',
					},
					{
						name: 'End User',
						value: 'END_USER',
					},
					{
						name: 'Executive Sponsor',
						value: 'EXECUTIVE_SPONSOR',
					},
					{
						name: 'Influencer',
						value: 'INFLUENCER',
					},
					{
						name: 'Legal & Compliance',
						value: 'LEGAL_AND_COMPLIANCE',
					},
					{
						name: 'Other',
						value: 'OTHER',
					},
				],
			},
			{
				displayName: 'Country/Region Code',
				name: 'countryRegionCode',
				description: "The contact's two-letter country code",
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email Address Quarantine Reason',
				name: 'emailCustomerQuarantinedReason',
				description: 'The reason why the email address has been quarantined',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Suspension Remediation',
						value: 'SUSPENSION_REMEDIATION',
					},
					{
						name: 'Blocklist Remediation',
						value: 'BLOCKLIST_REMEDIATION',
					},
					{
						name: 'Trust & Safety Remediation',
						value: 'TRUST_SAFETY_REMEDIATION',
					},
				],
			},
			{
				displayName: 'Employment Role',
				name: 'employmentRole',
				description: 'Job role',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Accounting',
						value: 'accounting',
					},
					{
						name: 'Administrative',
						value: 'administrative',
					},
					{
						name: 'Business Development',
						value: 'business_development',
					},
					{
						name: 'Communications',
						value: 'communications',
					},
					{
						name: 'Consulting',
						value: 'consulting',
					},
					{
						name: 'Customer Service',
						value: 'customer_service',
					},
					{
						name: 'Design',
						value: 'design',
					},
					{
						name: 'Education',
						value: 'education',
					},
					{
						name: 'Engineering',
						value: 'engineering',
					},
					{
						name: 'Entrepreneurship',
						value: 'entrepreneurship',
					},
					{
						name: 'Finance',
						value: 'finance',
					},
					{
						name: 'Health Professional',
						value: 'health_professional',
					},
					{
						name: 'Human Resources',
						value: 'human_resources',
					},
					{
						name: 'Information Technology',
						value: 'information_technology',
					},
					{
						name: 'Legal',
						value: 'legal',
					},
					{
						name: 'Marketing',
						value: 'marketing',
					},
					{
						name: 'Operations',
						value: 'operations',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Project Management',
						value: 'project_management',
					},
					{
						name: 'Public Relations',
						value: 'public_relations',
					},
					{
						name: 'Quality Assurance',
						value: 'quality_assurance',
					},
					{
						name: 'Real Estate',
						value: 'real_estate',
					},
					{
						name: 'Recruiting',
						value: 'recruiting',
					},
					{
						name: 'Research',
						value: 'research',
					},
					{
						name: 'Retired',
						value: 'retired',
					},
					{
						name: 'Sales',
						value: 'sales',
					},
					{
						name: 'Support',
						value: 'support',
					},
				],
			},
			{
				displayName: 'Enriched Email Bounce Detected',
				name: 'enrichedEmailBounceDetected',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Employment Seniority',
				name: 'employmentSeniority',
				description: 'Job Seniority',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Director',
						value: 'director',
					},
					{
						name: 'Employee',
						value: 'employee',
					},
					{
						name: 'Entry',
						value: 'entry',
					},
					{
						name: 'Executive',
						value: 'executive',
					},
					{
						name: 'Manager',
						value: 'manager',
					},
					{
						name: 'Owner',
						value: 'owner',
					},
					{
						name: 'Partner',
						value: 'partner',
					},
					{
						name: 'Senior',
						value: 'senior',
					},
					{
						name: 'VP',
						value: 'vp',
					},
				],
			},
			{
				displayName: 'Employment Sub Role',
				name: 'employmentSubRole',
				description: 'Job sub role',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Account Executive',
						value: 'account_executive',
					},
					{
						name: 'Account Manager',
						value: 'account_manager',
					},
					{
						name: 'Accountant',
						value: 'accountant',
					},
					{
						name: 'Accounting Manager',
						value: 'accounting_manager',
					},
					{
						name: 'Administrative Assistant',
						value: 'administrative_assistant',
					},
					{
						name: 'Appraisal',
						value: 'appraisal',
					},
					{
						name: 'Architect IT',
						value: 'architect_it',
					},
					{
						name: 'Assistant',
						value: 'assistant',
					},
					{
						name: 'Attorney',
						value: 'attorney',
					},
					{
						name: 'Auditor',
						value: 'auditor',
					},
					{
						name: 'Brand Marketing',
						value: 'brand_marketing',
					},
					{
						name: 'Business Analyst',
						value: 'business_analyst',
					},
					{
						name: 'Business Consultant',
						value: 'business_consultant',
					},
					{
						name: 'Business Manager',
						value: 'business_manager',
					},
					{
						name: 'Chief Compliance Officer',
						value: 'chief_compliance_officer',
					},
					{
						name: 'Chief Data Officer',
						value: 'chief_data_officer',
					},
					{
						name: 'Chief Executive Officer',
						value: 'chief_executive_officer',
					},
					{
						name: 'Chief Experience Officer',
						value: 'chief_experience_officer',
					},
					{
						name: 'Chief Financial Officer',
						value: 'chief_financial_officer',
					},
					{
						name: 'Chief Human Resources Officer',
						value: 'chief_human_resources_officer',
					},
					{
						name: 'Chief Information Officer',
						value: 'chief_information_officer',
					},
					{
						name: 'Chief Innovation Officer',
						value: 'chief_innovation_officer',
					},
					{
						name: 'Chief Legal Officer',
						value: 'chief_legal_officer',
					},
					{
						name: 'Chief Marketing Officer',
						value: 'chief_marketing_officer',
					},
					{
						name: 'Chief Operating Officer',
						value: 'chief_operating_officer',
					},
					{
						name: 'Chief Product Officer',
						value: 'chief_product_officer',
					},
					{
						name: 'Chief Revenue Officer',
						value: 'chief_revenue_officer',
					},
					{
						name: 'Chief Risk Officer',
						value: 'chief_risk_officer',
					},
					{
						name: 'Chief Security Officer',
						value: 'chief_security_officer',
					},
					{
						name: 'Chief Sustainability Officer',
						value: 'chief_sustainability_officer',
					},
					{
						name: 'Chief Technology Officer',
						value: 'chief_technology_officer',
					},
					{
						name: 'Communications Manager',
						value: 'communications_manager',
					},
					{
						name: 'Community',
						value: 'community',
					},
					{
						name: 'Content Marketing',
						value: 'content_marketing',
					},
					{
						name: 'Contracts',
						value: 'contracts',
					},
					{
						name: 'Creative',
						value: 'creative',
					},
					{
						name: 'Customer Service Specialist',
						value: 'customer_service_specialist',
					},
					{
						name: 'Customer Success',
						value: 'customer_success',
					},
					{
						name: 'Data IT',
						value: 'data_it',
					},
					{
						name: 'Data Science Engineer',
						value: 'data_science_engineer',
					},
					{
						name: 'Database Administrator',
						value: 'database_administrator',
					},
					{
						name: 'Design Engineer',
						value: 'design_engineer',
					},
					{
						name: 'Development Specialist',
						value: 'development_specialist',
					},
					{
						name: 'Devops Engineer',
						value: 'devops_engineer',
					},
					{
						name: 'Digital Marketing',
						value: 'digital_marketing',
					},
					{
						name: 'Director of Development',
						value: 'director_of_development',
					},
					{
						name: 'Editorial',
						value: 'editorial',
					},
					{
						name: 'Electrical Engineer',
						value: 'electrical_engineer',
					},
					{
						name: 'Engineering Manager',
						value: 'engineering_manager',
					},
					{
						name: 'Events',
						value: 'events',
					},
					{
						name: 'Executive Assistant',
						value: 'executive_assistant',
					},
					{
						name: 'Facilities',
						value: 'facilities',
					},
					{
						name: 'Fashion Design',
						value: 'fashion_design',
					},
					{
						name: 'Field Marketing',
						value: 'field_marketing',
					},
					{
						name: 'Financial Analyst',
						value: 'financial_analyst',
					},
					{
						name: 'Financial Controller',
						value: 'financial_controller',
					},
					{
						name: 'Fitness',
						value: 'fitness',
					},
					{
						name: 'Founder',
						value: 'founder',
					},
					{
						name: 'General Counsel',
						value: 'general_counsel',
					},
					{
						name: 'General Manager',
						value: 'general_manager',
					},
					{
						name: 'General Partner',
						value: 'general_partner',
					},
					{
						name: 'Graphic Design',
						value: 'graphic_design',
					},
					{
						name: 'Human Resources Specialist',
						value: 'human_resources_specialist',
					},
					{
						name: 'Information Technology Specialist',
						value: 'information_technology_specialist',
					},
					{
						name: 'Investment',
						value: 'investment',
					},
					{
						name: 'Investment Banker',
						value: 'investment_banker',
					},
					{
						name: 'Journalist',
						value: 'journalist',
					},
					{
						name: 'Key Account Manager',
						value: 'key_account_manager',
					},
					{
						name: 'Law Enforcement',
						value: 'law_enforcement',
					},
					{
						name: 'Lawyer',
						value: 'lawyer',
					},
					{
						name: 'Logistics Manager',
						value: 'logistics_manager',
					},
					{
						name: 'Management',
						value: 'management',
					},
					{
						name: 'Marketing Specialist',
						value: 'marketing_specialist',
					},
					{
						name: 'Mechanical Engineer',
						value: 'mechanical_engineer',
					},
					{
						name: 'Medical Doctor',
						value: 'medical_doctor',
					},
					{
						name: 'Network Engineer',
						value: 'network_engineer',
					},
					{
						name: 'Nurse',
						value: 'nurse',
					},
					{
						name: 'Office Management',
						value: 'office_management',
					},
					{
						name: 'Office Manager',
						value: 'office_manager',
					},
					{
						name: 'Operational Specialist',
						value: 'operational_specialist',
					},
					{
						name: 'Owner',
						value: 'owner',
					},
					{
						name: 'Paralegal',
						value: 'paralegal',
					},
					{
						name: 'Principal',
						value: 'principal',
					},
					{
						name: 'Product Design',
						value: 'product_design',
					},
					{
						name: 'Product Manager',
						value: 'product_manager',
					},
					{
						name: 'Product Marketing',
						value: 'product_marketing',
					},
					{
						name: 'Production Manager',
						value: 'production_manager',
					},
					{
						name: 'Professor',
						value: 'professor',
					},
					{
						name: 'Program Coordinator',
						value: 'program_coordinator',
					},
					{
						name: 'Program Manager',
						value: 'program_manager',
					},
					{
						name: 'Project Engineer',
						value: 'project_engineer',
					},
					{
						name: 'Project Manager',
						value: 'project_manager',
					},
					{
						name: 'Property Manager',
						value: 'property_manager',
					},
					{
						name: 'QA Engineer',
						value: 'qa_engineer',
					},
					{
						name: 'QA IT',
						value: 'qa_it',
					},
					{
						name: 'Quality Assurance Manager',
						value: 'quality_assurance_manager',
					},
					{
						name: 'Quality Assurance Specialist',
						value: 'quality_assurance_specialist',
					},
					{
						name: 'Realtor',
						value: 'realtor',
					},
					{
						name: 'Recruiter',
						value: 'recruiter',
					},
					{
						name: 'Relationship Manager',
						value: 'relationship_manager',
					},
					{
						name: 'Research Analyst',
						value: 'research_analyst',
					},
					{
						name: 'Retail',
						value: 'retail',
					},
					{
						name: 'Retired',
						value: 'retired',
					},
					{
						name: 'Risk Compliance',
						value: 'risk_compliance',
					},
					{
						name: 'Sales Executive',
						value: 'sales_executive',
					},
					{
						name: 'Sales Operations',
						value: 'sales_operations',
					},
					{
						name: 'Sales Specialist',
						value: 'sales_specialist',
					},
					{
						name: 'Salesperson',
						value: 'salesperson',
					},
					{
						name: 'Secretary',
						value: 'secretary',
					},
					{
						name: 'Social Marketing',
						value: 'social_marketing',
					},
					{
						name: 'Software Engineer',
						value: 'software_engineer',
					},
					{
						name: 'Strategy',
						value: 'strategy',
					},
					{
						name: 'Student',
						value: 'student',
					},
					{
						name: 'Support',
						value: 'support',
					},
					{
						name: 'Support Specialist',
						value: 'support_specialist',
					},
					{
						name: 'System Administrator',
						value: 'system_administrator',
					},
					{
						name: 'System Analyst',
						value: 'system_analyst',
					},
					{
						name: 'Systems Engineer',
						value: 'systems_engineer',
					},
					{
						name: 'Talent',
						value: 'talent',
					},
					{
						name: 'Tax Audit',
						value: 'tax_audit',
					},
					{
						name: 'Teacher',
						value: 'teacher',
					},
					{
						name: 'Technical Manager',
						value: 'technical_manager',
					},
					{
						name: 'Technical Support Specialist',
						value: 'technical_support_specialist',
					},
					{
						name: 'Therapist',
						value: 'therapist',
					},
					{
						name: 'Training',
						value: 'training',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Web Developer',
						value: 'web_developer',
					},
					{
						name: 'Writer',
						value: 'writer',
					},
				],
			},
			{
				displayName: 'Inferred Language Codes',
				name: 'inferredLanguageCodes',
				description: 'Inferred languages based on location. ISO 639-1.',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Abkhazian',
						value: 'ab',
					},
					{
						name: 'Afar',
						value: 'aa',
					},
					{
						name: 'Afrikaans',
						value: 'af',
					},
					{
						name: 'Akan',
						value: 'ak',
					},
					{
						name: 'Albanian',
						value: 'sq',
					},
					{
						name: 'Amharic',
						value: 'am',
					},
					{
						name: 'Arabic',
						value: 'ar',
					},
					{
						name: 'Aragonese',
						value: 'an',
					},
					{
						name: 'Armenian',
						value: 'hy',
					},
					{
						name: 'Assamese',
						value: 'as',
					},
					{
						name: 'Avaric',
						value: 'av',
					},
					{
						name: 'Avestan',
						value: 'ae',
					},
					{
						name: 'Aymara',
						value: 'ay',
					},
					{
						name: 'Azerbaijani',
						value: 'az',
					},
					{
						name: 'Bambara',
						value: 'bm',
					},
					{
						name: 'Bashkir',
						value: 'ba',
					},
					{
						name: 'Basque',
						value: 'eu',
					},
					{
						name: 'Belarusian',
						value: 'be',
					},
					{
						name: 'Bengali',
						value: 'bn',
					},
					{
						name: 'Bislama',
						value: 'bi',
					},
					{
						name: 'Bokmål, Norwegian; Norwegian Bokmål',
						value: 'nb',
					},
					{
						name: 'Bosnian',
						value: 'bs',
					},
					{
						name: 'Breton',
						value: 'br',
					},
					{
						name: 'Bulgarian',
						value: 'bg',
					},
					{
						name: 'Burmese',
						value: 'my',
					},
					{
						name: 'Catalan; Valencian',
						value: 'ca',
					},
					{
						name: 'Central Khmer',
						value: 'km',
					},
					{
						name: 'Chamorro',
						value: 'ch',
					},
					{
						name: 'Chechen',
						value: 'ce',
					},
					{
						name: 'Chichewa; Chewa; Nyanja',
						value: 'ny',
					},
					{
						name: 'Chinese',
						value: 'zh',
					},
					{
						name: 'Church Slavic; Old Slavonic; Church Slavonic; Old Bulgarian; Old Church Slavonic',
						value: 'cu',
					},
					{
						name: 'Chuvash',
						value: 'cv',
					},
					{
						name: 'Cornish',
						value: 'kw',
					},
					{
						name: 'Corsican',
						value: 'co',
					},
					{
						name: 'Cree',
						value: 'cr',
					},
					{
						name: 'Croatian',
						value: 'hr',
					},
					{
						name: 'Czech',
						value: 'cs',
					},
					{
						name: 'Danish',
						value: 'da',
					},
					{
						name: 'Divehi; Dhivehi; Maldivian',
						value: 'dv',
					},
					{
						name: 'Dutch; Flemish',
						value: 'nl',
					},
					{
						name: 'Dzongkha',
						value: 'dz',
					},
					{
						name: 'English',
						value: 'en',
					},
					{
						name: 'Esperanto',
						value: 'eo',
					},
					{
						name: 'Estonian',
						value: 'et',
					},
					{
						name: 'Ewe',
						value: 'ee',
					},
					{
						name: 'Faroese',
						value: 'fo',
					},
					{
						name: 'Fijian',
						value: 'fj',
					},
					{
						name: 'Finnish',
						value: 'fi',
					},
					{
						name: 'French',
						value: 'fr',
					},
					{
						name: 'Fulah',
						value: 'ff',
					},
					{
						name: 'Gaelic; Scottish Gaelic',
						value: 'gd',
					},
					{
						name: 'Galician',
						value: 'gl',
					},
					{
						name: 'Ganda',
						value: 'lg',
					},
					{
						name: 'Georgian',
						value: 'ka',
					},
					{
						name: 'German',
						value: 'de',
					},
					{
						name: 'Greek, Modern (1453-)',
						value: 'el',
					},
					{
						name: 'Guarani',
						value: 'gn',
					},
					{
						name: 'Gujarati',
						value: 'gu',
					},
					{
						name: 'Haitian; Haitian Creole',
						value: 'ht',
					},
					{
						name: 'Hausa',
						value: 'ha',
					},
					{
						name: 'Hebrew',
						value: 'he',
					},
					{
						name: 'Herero',
						value: 'hz',
					},
					{
						name: 'Hindi',
						value: 'hi',
					},
					{
						name: 'Hiri Motu',
						value: 'ho',
					},
					{
						name: 'Hungarian',
						value: 'hu',
					},
					{
						name: 'Icelandic',
						value: 'is',
					},
					{
						name: 'Ido',
						value: 'io',
					},
					{
						name: 'Igbo',
						value: 'ig',
					},
					{
						name: 'Indonesian',
						value: 'id',
					},
					{
						name: 'Interlingua (International Auxiliary Language Association)',
						value: 'ia',
					},
					{
						name: 'Interlingue; Occidental',
						value: 'ie',
					},
					{
						name: 'Inuktitut',
						value: 'iu',
					},
					{
						name: 'Inupiaq',
						value: 'ik',
					},
					{
						name: 'Irish',
						value: 'ga',
					},
					{
						name: 'Italian',
						value: 'it',
					},
					{
						name: 'Japanese',
						value: 'ja',
					},
					{
						name: 'Javanese',
						value: 'jv',
					},
					{
						name: 'Kalaallisut; Greenlandic',
						value: 'kl',
					},
					{
						name: 'Kannada',
						value: 'kn',
					},
					{
						name: 'Kanuri',
						value: 'kr',
					},
					{
						name: 'Kashmiri',
						value: 'ks',
					},
					{
						name: 'Kazakh',
						value: 'kk',
					},
					{
						name: 'Kikuyu; Gikuyu',
						value: 'ki',
					},
					{
						name: 'Kinyarwanda',
						value: 'rw',
					},
					{
						name: 'Kirghiz; Kyrgyz',
						value: 'ky',
					},
					{
						name: 'Komi',
						value: 'kv',
					},
					{
						name: 'Kongo',
						value: 'kg',
					},
					{
						name: 'Korean',
						value: 'ko',
					},
					{
						name: 'Kuanyama; Kwanyama',
						value: 'kj',
					},
					{
						name: 'Kurdish',
						value: 'ku',
					},
					{
						name: 'Lao',
						value: 'lo',
					},
					{
						name: 'Latin',
						value: 'la',
					},
					{
						name: 'Latvian',
						value: 'lv',
					},
					{
						name: 'Limburgan; Limburger; Limburgish',
						value: 'li',
					},
					{
						name: 'Lingala',
						value: 'ln',
					},
					{
						name: 'Lithuanian',
						value: 'lt',
					},
					{
						name: 'Luba-Katanga',
						value: 'lu',
					},
					{
						name: 'Luxembourgish; Letzeburgesch',
						value: 'lb',
					},
					{
						name: 'Macedonian',
						value: 'mk',
					},
					{
						name: 'Malagasy',
						value: 'mg',
					},
					{
						name: 'Malay (Macrolanguage)',
						value: 'ms',
					},
					{
						name: 'Malayalam',
						value: 'ml',
					},
					{
						name: 'Maltese',
						value: 'mt',
					},
					{
						name: 'Manx',
						value: 'gv',
					},
					{
						name: 'Maori',
						value: 'mi',
					},
					{
						name: 'Marathi',
						value: 'mr',
					},
					{
						name: 'Marshallese',
						value: 'mh',
					},
					{
						name: 'Mongolian',
						value: 'mn',
					},
					{
						name: 'Nauru',
						value: 'na',
					},
					{
						name: 'Navajo; Navaho',
						value: 'nv',
					},
					{
						name: 'Ndebele, North; North Ndebele',
						value: 'nd',
					},
					{
						name: 'Ndebele, South; South Ndebele',
						value: 'nr',
					},
					{
						name: 'Ndonga',
						value: 'ng',
					},
					{
						name: 'Nepali (Macrolanguage)',
						value: 'ne',
					},
					{
						name: 'Northern Sami',
						value: 'se',
					},
					{
						name: 'Norwegian',
						value: 'no',
					},
					{
						name: 'Norwegian Nynorsk; Nynorsk, Norwegian',
						value: 'nn',
					},
					{
						name: 'Occitan (Post 1500)',
						value: 'oc',
					},
					{
						name: 'Ojibwa',
						value: 'oj',
					},
					{
						name: 'Oriya (Macrolanguage)',
						value: 'or',
					},
					{
						name: 'Oromo',
						value: 'om',
					},
					{
						name: 'Ossetian; Ossetic',
						value: 'os',
					},
					{
						name: 'Pali',
						value: 'pi',
					},
					{
						name: 'Panjabi; Punjabi',
						value: 'pa',
					},
					{
						name: 'Persian',
						value: 'fa',
					},
					{
						name: 'Polish',
						value: 'pl',
					},
					{
						name: 'Portuguese',
						value: 'pt',
					},
					{
						name: 'Pushto; Pashto',
						value: 'ps',
					},
					{
						name: 'Quechua',
						value: 'qu',
					},
					{
						name: 'Romanian; Moldavian; Moldovan',
						value: 'ro',
					},
					{
						name: 'Romansh',
						value: 'rm',
					},
					{
						name: 'Rundi',
						value: 'rn',
					},
					{
						name: 'Russian',
						value: 'ru',
					},
					{
						name: 'Samoan',
						value: 'sm',
					},
					{
						name: 'Sango',
						value: 'sg',
					},
					{
						name: 'Sanskrit',
						value: 'sa',
					},
					{
						name: 'Sardinian',
						value: 'sc',
					},
					{
						name: 'Serbian',
						value: 'sr',
					},
					{
						name: 'Shona',
						value: 'sn',
					},
					{
						name: 'Sichuan Yi; Nuosu',
						value: 'ii',
					},
					{
						name: 'Sindhi',
						value: 'sd',
					},
					{
						name: 'Sinhala; Sinhalese',
						value: 'si',
					},
					{
						name: 'Slovak',
						value: 'sk',
					},
					{
						name: 'Slovenian',
						value: 'sl',
					},
					{
						name: 'Somali',
						value: 'so',
					},
					{
						name: 'Sotho, Southern',
						value: 'st',
					},
					{
						name: 'Spanish; Castilian',
						value: 'es',
					},
					{
						name: 'Sundanese',
						value: 'su',
					},
					{
						name: 'Swahili (Macrolanguage)',
						value: 'sw',
					},
					{
						name: 'Swati',
						value: 'ss',
					},
					{
						name: 'Swedish',
						value: 'sv',
					},
					{
						name: 'Tagalog',
						value: 'tl',
					},
					{
						name: 'Tahitian',
						value: 'ty',
					},
					{
						name: 'Tajik',
						value: 'tg',
					},
					{
						name: 'Tamil',
						value: 'ta',
					},
					{
						name: 'Tatar',
						value: 'tt',
					},
					{
						name: 'Telugu',
						value: 'te',
					},
					{
						name: 'Thai',
						value: 'th',
					},
					{
						name: 'Tibetan',
						value: 'bo',
					},
					{
						name: 'Tigrinya',
						value: 'ti',
					},
					{
						name: 'Tonga (Tonga Islands)',
						value: 'to',
					},
					{
						name: 'Tsonga',
						value: 'ts',
					},
					{
						name: 'Tswana',
						value: 'tn',
					},
					{
						name: 'Turkish',
						value: 'tr',
					},
					{
						name: 'Turkmen',
						value: 'tk',
					},
					{
						name: 'Twi',
						value: 'tw',
					},
					{
						name: 'Uighur; Uyghur',
						value: 'ug',
					},
					{
						name: 'Ukrainian',
						value: 'uk',
					},
					{
						name: 'Urdu',
						value: 'ur',
					},
					{
						name: 'Uzbek',
						value: 'uz',
					},
					{
						name: 'Venda',
						value: 've',
					},
					{
						name: 'Vietnamese',
						value: 'vi',
					},
					{
						name: 'Volapük',
						value: 'vo',
					},
					{
						name: 'Walloon',
						value: 'wa',
					},
					{
						name: 'Welsh',
						value: 'cy',
					},
					{
						name: 'Western Frisian',
						value: 'fy',
					},
					{
						name: 'Wolof',
						value: 'wo',
					},
					{
						name: 'Xhosa',
						value: 'xh',
					},
					{
						name: 'Yiddish',
						value: 'yi',
					},
					{
						name: 'Yoruba',
						value: 'yo',
					},
					{
						name: 'Zhuang; Chuang',
						value: 'za',
					},
					{
						name: 'Zulu',
						value: 'zu',
					},
				],
			},
			{
				displayName: 'Latest Traffic Source',
				name: 'latestTrafficSource',
				description: 'The source of the latest session for a contact',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Direct Traffic',
						value: 'DIRECT_TRAFFIC',
					},
					{
						name: 'Email Marketing',
						value: 'EMAIL_MARKETING',
					},
					{
						name: 'Offline Sources',
						value: 'OFFLINE',
					},
					{
						name: 'Organic Search',
						value: 'ORGANIC_SEARCH',
					},
					{
						name: 'Organic Social',
						value: 'SOCIAL_MEDIA',
					},
					{
						name: 'Other Campaigns',
						value: 'OTHER_CAMPAIGNS',
					},
					{
						name: 'Paid Search',
						value: 'PAID_SEARCH',
					},
					{
						name: 'Paid Social',
						value: 'PAID_SOCIAL',
					},
					{
						name: 'Referrals',
						value: 'REFERRALS',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['upsert'],
			},
		},
		options: [
			{
				displayName: 'Simplify Output',
				name: 'resolveData',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default the response only includes the ID. If this option gets activated, it will resolve the data automatically.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact to Get',
		name: 'contactId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		hint: 'To lookup a user by their email, use the Search operation',
		displayOptions: {
			show: {
				resource: ['contact'],
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
					searchListMethod: 'searchContacts',
					searchable: true,
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
							errorMessage: 'Not a valid HubSpot Contact ID',
						},
					},
				],
			},
		],
		description: "This is not a contact's email but a number like 1485",
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['get'],
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
				displayName: 'Include List Memberships',
				name: 'listMemberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Contact Properties to Include',
				name: 'propertiesCollection',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'propertiesValues',
						displayName: 'Contact Properties to Include',
						values: [
							{
								displayName: 'Contact Properties to Include',
								name: 'properties',
								type: 'multiOptions',
								typeOptions: {
									multipleValueButtonText: 'test',
									loadOptionsMethod: 'getContactProperties',
								},
								default: [],
								description:
									'Whether to include specific Contact properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'<p>Used to include specific contact properties in the results. By default, the results will only include Contact ID and will not include the values for any properties for your Contact.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getAll'],
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
				displayName: 'Include List Memberships',
				name: 'listMemberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Contact Properties to Include',
				name: 'propertiesCollection',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'propertiesValues',
						displayName: 'Contact Properties to Include',
						values: [
							{
								displayName: 'Contact Properties to Include',
								name: 'properties',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getContactProperties',
								},
								default: [],
								description:
									'Whether to include specific Contact properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'<p>Used to include specific contact properties in the results. By default, the results will only include Contact ID and will not include the values for any properties for your Contact.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact to Delete',
		name: 'contactId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		hint: 'To lookup a user by their email, use the Search operation',
		displayOptions: {
			show: {
				resource: ['contact'],
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
					searchListMethod: 'searchContacts',
					searchable: true,
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
							errorMessage: 'Not a valid HubSpot Contact ID',
						},
					},
				],
			},
		],
		description: "This is not a contact's email but a number like 1485",
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
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['getRecentlyCreatedUpdated'],
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
				displayName: 'Include List Memberships',
				name: 'listMemberships',
				type: 'boolean',
				default: true,
				description: 'Whether current list memberships should be fetched for the contact',
			},
			{
				displayName: 'Contact Properties to Include',
				name: 'propertiesCollection',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'propertiesValues',
						displayName: 'Contact Properties to Include',
						values: [
							{
								displayName: 'Contact Properties to Include',
								name: 'properties',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getContactProperties',
								},
								default: [],
								description:
									'Whether to include specific Contact properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'<p>Used to include specific contact properties in the results. By default, the results will only include Contact ID and will not include the values for any properties for your Contact.</p><p>Including this parameter will include the data for the specified property in the results. You can include this parameter multiple times to request multiple properties separated by a comma: <code>,</code>.</p>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				resource: ['contact'],
				operation: ['search'],
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
										description:
											'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
										typeOptions: {
											loadOptionsMethod: 'getContactPropertiesWithType',
										},
										default: '',
									},
									{
										displayName: 'Type',
										name: 'type',
										type: 'hidden',
										default: '={{$parameter["&propertyName"].split("|")[1]}}',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										displayOptions: {
											hide: {
												type: ['number'],
											},
										},
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
												name: 'Is Known',
												value: 'HAS_PROPERTY',
											},
											{
												name: 'Is Unknown',
												value: 'NOT_HAS_PROPERTY',
											},
											{
												name: 'Not Equal',
												value: 'NEQ',
											},
										],
										default: 'EQ',
									},
									{
										displayName: 'Operator',
										name: 'operator',
										type: 'options',
										displayOptions: {
											show: {
												type: ['number'],
											},
										},
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
												operator: ['HAS_PROPERTY', 'NOT_HAS_PROPERTY'],
											},
										},
										required: true,
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
			'When multiple filters are provided within a Filter Group, they will be combined using a logical AND operator. When multiple Filter Groups are provided, they will be combined using a logical OR operator. The system supports a maximum of three Filter Groups with up to three filters each. More info <a href="https://developers.hubspot.com/docs/api/crm/search">here</a>',
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['search'],
			},
		},
		options: [
			{
				displayName: 'Sort Order',
				name: 'direction',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: 'DESCENDING',
				description:
					'Defines the direction in which search results are ordered. Default value is Descending.',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'properties',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getContactProperties',
				},
				default: ['firstname', 'lastname', 'email'],
				description:
					'Whether to include specific Contact properties in the returned results. Choose from a list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
