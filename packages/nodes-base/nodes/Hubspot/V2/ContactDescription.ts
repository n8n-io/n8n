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
				displayName: 'Country/Region',
				name: 'country',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Country/Region Code',
				name: 'countryRegionCode',
				description: "The contact's two-letter country code",
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
				displayName: 'Enriched Email Bounce Detected',
				name: 'enrichedEmailBounceDetected',
				type: 'boolean',
				default: false,
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
			{
				displayName: 'Latest Traffic Source Date',
				name: 'latestTrafficSourceDate',
				description: 'The time of the latest session for a contact',
				type: 'dateTime',
				default: '',
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
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				description: "The URL of the contact's LinkedIn page",
				type: 'string',
				default: '',
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
				displayName: 'Member Email',
				name: 'memberEmail',
				description: 'Email used to send private content information to members',
				type: 'string',
				default: '',
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
				displayName: 'Military Status',
				name: 'militaryStatus',
				description:
					"Contact's military status. Required for the Facebook Ads Integration. Automatically synced from the Lead Ads tool.",
				type: 'string',
				default: '',
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
				displayName: 'Persona',
				name: 'persona',
				description: "A contact's persona",
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: "A contact's primary phone number",
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
				displayName: 'Prospecting Agent Last Enrolled',
				name: 'prospectingAgentLastEnrolled',
				description: 'The last time the Prospecting Agent enrolled this contact',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Prospecting Agent Total Enrolled Count',
				name: 'prospectingAgentTotalEnrolledCount',
				type: 'number',
				default: '',
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
				displayName: 'State/Region Code',
				name: 'stateRegionCode',
				description: "The contact's state or region code",
				type: 'string',
				default: '',
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
				displayName: 'Time Zone',
				name: 'timeZone',
				description:
					'The contact’s time zone. This can be set automatically by HubSpot based on other contact properties. It can also be set manually for each contact.',
				type: 'options',
				default: '',
				options: [
					{
						name: 'UTC -01:00 Atlantic Cape Verde',
						value: 'atlantic_slash_cape_verde',
					},
					{
						name: 'UTC -02:00 America Godthab',
						value: 'america_slash_godthab',
					},
					{
						name: 'UTC -02:00 America Miquelon',
						value: 'america_slash_miquelon',
					},
					{
						name: 'UTC -02:00 America Noronha',
						value: 'america_slash_noronha',
					},
					{
						name: 'UTC -02:00 Atlantic South Georgia',
						value: 'atlantic_slash_south_georgia',
					},
					{
						name: 'UTC -02:00 Brazil DeNoronha',
						value: 'brazil_slash_denoronha',
					},
					{
						name: 'UTC -02:30 America St Johns',
						value: 'america_slash_st_johns',
					},
					{
						name: 'UTC -02:30 Canada Newfoundland',
						value: 'canada_slash_newfoundland',
					},
					{
						name: 'UTC -03:00 America Araguaina',
						value: 'america_slash_araguaina',
					},
					{
						name: 'UTC -03:00 America Argentina (Buenos Aires)',
						value: 'america_slash_argentina_slash_buenos_aires',
					},
					{
						name: 'UTC -03:00 America Argentina (Catamarca)',
						value: 'america_slash_argentina_slash_catamarca',
					},
					{
						name: 'UTC -03:00 America Argentina (ComodRivadavia)',
						value: 'america_slash_argentina_slash_comodrivadavia',
					},
					{
						name: 'UTC -03:00 America Argentina (Cordoba)',
						value: 'america_slash_argentina_slash_cordoba',
					},
					{
						name: 'UTC -03:00 America Argentina (Jujuy)',
						value: 'america_slash_argentina_slash_jujuy',
					},
					{
						name: 'UTC -03:00 America Argentina (La Rioja)',
						value: 'america_slash_argentina_slash_la_rioja',
					},
					{
						name: 'UTC -03:00 America Argentina (Mendoza)',
						value: 'america_slash_argentina_slash_mendoza',
					},
					{
						name: 'UTC -03:00 America Argentina (Rio Gallegos)',
						value: 'america_slash_argentina_slash_rio_gallegos',
					},
					{
						name: 'UTC -03:00 America Argentina (Salta)',
						value: 'america_slash_argentina_slash_salta',
					},
					{
						name: 'UTC -03:00 America Argentina (San Juan)',
						value: 'america_slash_argentina_slash_san_juan',
					},
					{
						name: 'UTC -03:00 America Argentina (San Luis)',
						value: 'america_slash_argentina_slash_san_luis',
					},
					{
						name: 'UTC -03:00 America Argentina (Tucuman)',
						value: 'america_slash_argentina_slash_tucuman',
					},
					{
						name: 'UTC -03:00 America Argentina (Ushuaia)',
						value: 'america_slash_argentina_slash_ushuaia',
					},
					{
						name: 'UTC -03:00 America Bahia',
						value: 'america_slash_bahia',
					},
					{
						name: 'UTC -03:00 America Belem',
						value: 'america_slash_belem',
					},
					{
						name: 'UTC -03:00 America Buenos Aires',
						value: 'america_slash_buenos_aires',
					},
					{
						name: 'UTC -03:00 America Catamarca',
						value: 'america_slash_catamarca',
					},
					{
						name: 'UTC -03:00 America Cayenne',
						value: 'america_slash_cayenne',
					},
					{
						name: 'UTC -03:00 America Cordoba',
						value: 'america_slash_cordoba',
					},
					{
						name: 'UTC -03:00 America Fortaleza',
						value: 'america_slash_fortaleza',
					},
					{
						name: 'UTC -03:00 America Glace Bay',
						value: 'america_slash_glace_bay',
					},
					{
						name: 'UTC -03:00 America Goose Bay',
						value: 'america_slash_goose_bay',
					},
					{
						name: 'UTC -03:00 America Halifax',
						value: 'america_slash_halifax',
					},
					{
						name: 'UTC -03:00 America Jujuy',
						value: 'america_slash_jujuy',
					},
					{
						name: 'UTC -03:00 America Maceio',
						value: 'america_slash_maceio',
					},
					{
						name: 'UTC -03:00 America Mendoza',
						value: 'america_slash_mendoza',
					},
					{
						name: 'UTC -03:00 America Moncton',
						value: 'america_slash_moncton',
					},
					{
						name: 'UTC -03:00 America Montevideo',
						value: 'america_slash_montevideo',
					},
					{
						name: 'UTC -03:00 America Paramaribo',
						value: 'america_slash_paramaribo',
					},
					{
						name: 'UTC -03:00 America Punta Arenas',
						value: 'america_slash_punta_arenas',
					},
					{
						name: 'UTC -03:00 America Recife',
						value: 'america_slash_recife',
					},
					{
						name: 'UTC -03:00 America Rosario',
						value: 'america_slash_rosario',
					},
					{
						name: 'UTC -03:00 America Santarem',
						value: 'america_slash_santarem',
					},
					{
						name: 'UTC -03:00 America Sao Paulo',
						value: 'america_slash_sao_paulo',
					},
					{
						name: 'UTC -03:00 America Thule',
						value: 'america_slash_thule',
					},
					{
						name: 'UTC -03:00 Antarctica Palmer',
						value: 'antarctica_slash_palmer',
					},
					{
						name: 'UTC -03:00 Antarctica Rothera',
						value: 'antarctica_slash_rothera',
					},
					{
						name: 'UTC -03:00 Atlantic Bermuda',
						value: 'atlantic_slash_bermuda',
					},
					{
						name: 'UTC -03:00 Atlantic Stanley',
						value: 'atlantic_slash_stanley',
					},
					{
						name: 'UTC -03:00 Brazil East',
						value: 'brazil_slash_east',
					},
					{
						name: 'UTC -03:00 Canada Atlantic',
						value: 'canada_slash_atlantic',
					},
					{
						name: 'UTC -04:00 America Anguilla',
						value: 'america_slash_anguilla',
					},
					{
						name: 'UTC -04:00 America Antigua',
						value: 'america_slash_antigua',
					},
					{
						name: 'UTC -04:00 America Aruba',
						value: 'america_slash_aruba',
					},
					{
						name: 'UTC -04:00 America Asuncion',
						value: 'america_slash_asuncion',
					},
					{
						name: 'UTC -04:00 America Barbados',
						value: 'america_slash_barbados',
					},
					{
						name: 'UTC -04:00 America Blanc-Sablon',
						value: 'america_slash_blanc_hyphen_sablon',
					},
					{
						name: 'UTC -04:00 America Boa Vista',
						value: 'america_slash_boa_vista',
					},
					{
						name: 'UTC -04:00 America Campo Grande',
						value: 'america_slash_campo_grande',
					},
					{
						name: 'UTC -04:00 America Caracas',
						value: 'america_slash_caracas',
					},
					{
						name: 'UTC -04:00 America Cuba',
						value: 'cuba',
					},
					{
						name: 'UTC -04:00 America Cuiaba',
						value: 'america_slash_cuiaba',
					},
					{
						name: 'UTC -04:00 America Curacao',
						value: 'america_slash_curacao',
					},
					{
						name: 'UTC -04:00 America Detroit',
						value: 'america_slash_detroit',
					},
					{
						name: 'UTC -04:00 America Dominica',
						value: 'america_slash_dominica',
					},
					{
						name: 'UTC -04:00 America Fort Wayne',
						value: 'america_slash_fort_wayne',
					},
					{
						name: 'UTC -04:00 America Grand Turk',
						value: 'america_slash_grand_turk',
					},
					{
						name: 'UTC -04:00 America Grenada',
						value: 'america_slash_grenada',
					},
					{
						name: 'UTC -04:00 America Guadeloupe',
						value: 'america_slash_guadeloupe',
					},
					{
						name: 'UTC -04:00 America Guyana',
						value: 'america_slash_guyana',
					},
					{
						name: 'UTC -04:00 America Havana',
						value: 'america_slash_havana',
					},
					{
						name: 'UTC -04:00 America Indiana (Indianapolis)',
						value: 'america_slash_indiana_slash_indianapolis',
					},
					{
						name: 'UTC -04:00 America Indiana (Marengo)',
						value: 'america_slash_indiana_slash_marengo',
					},
					{
						name: 'UTC -04:00 America Indiana (Petersburg)',
						value: 'america_slash_indiana_slash_petersburg',
					},
					{
						name: 'UTC -04:00 America Indiana (Vevay)',
						value: 'america_slash_indiana_slash_vevay',
					},
					{
						name: 'UTC -04:00 America Indiana (Vincennes)',
						value: 'america_slash_indiana_slash_vincennes',
					},
					{
						name: 'UTC -04:00 America Indiana (Winamac)',
						value: 'america_slash_indiana_slash_winamac',
					},
					{
						name: 'UTC -04:00 America Indianapolis',
						value: 'america_slash_indianapolis',
					},
					{
						name: 'UTC -04:00 America Iqaluit',
						value: 'america_slash_iqaluit',
					},
					{
						name: 'UTC -04:00 America Kentucky (Louisville)',
						value: 'america_slash_kentucky_slash_louisville',
					},
					{
						name: 'UTC -04:00 America Kentucky (Monticello)',
						value: 'america_slash_kentucky_slash_monticello',
					},
					{
						name: 'UTC -04:00 America Kralendijk',
						value: 'america_slash_kralendijk',
					},
					{
						name: 'UTC -04:00 America La Paz',
						value: 'america_slash_la_paz',
					},
					{
						name: 'UTC -04:00 America Louisville',
						value: 'america_slash_louisville',
					},
					{
						name: 'UTC -04:00 America Lower Princes',
						value: 'america_slash_lower_princes',
					},
					{
						name: 'UTC -04:00 America Manaus',
						value: 'america_slash_manaus',
					},
					{
						name: 'UTC -04:00 America Marigot',
						value: 'america_slash_marigot',
					},
					{
						name: 'UTC -04:00 America Martinique',
						value: 'america_slash_martinique',
					},
					{
						name: 'UTC -04:00 America Montreal',
						value: 'america_slash_montreal',
					},
					{
						name: 'UTC -04:00 America Montserrat',
						value: 'america_slash_montserrat',
					},
					{
						name: 'UTC -04:00 America Nassau',
						value: 'america_slash_nassau',
					},
					{
						name: 'UTC -04:00 America New York',
						value: 'america_slash_new_york',
					},
					{
						name: 'UTC -04:00 America Nipigon',
						value: 'america_slash_nipigon',
					},
					{
						name: 'UTC -04:00 America Pangnirtung',
						value: 'america_slash_pangnirtung',
					},
					{
						name: 'UTC -04:00 America Port of Spain',
						value: 'america_slash_port_of_spain',
					},
					{
						name: 'UTC -04:00 America Port-Au-Prince',
						value: 'america_slash_port_hyphen_au_hyphen_prince',
					},
					{
						name: 'UTC -04:00 America Porto Velho',
						value: 'america_slash_porto_velho',
					},
					{
						name: 'UTC -04:00 America Puerto Rico',
						value: 'america_slash_puerto_rico',
					},
					{
						name: 'UTC -04:00 America Santiago',
						value: 'america_slash_santiago',
					},
					{
						name: 'UTC -04:00 America Santo Domingo',
						value: 'america_slash_santo_domingo',
					},
					{
						name: 'UTC -04:00 America St Barthelemy',
						value: 'america_slash_st_barthelemy',
					},
					{
						name: 'UTC -04:00 America St Kitts',
						value: 'america_slash_st_kitts',
					},
					{
						name: 'UTC -04:00 America St Lucia',
						value: 'america_slash_st_lucia',
					},
					{
						name: 'UTC -04:00 America St Thomas',
						value: 'america_slash_st_thomas',
					},
					{
						name: 'UTC -04:00 America St Vincent',
						value: 'america_slash_st_vincent',
					},
					{
						name: 'UTC -04:00 America Thunder Bay',
						value: 'america_slash_thunder_bay',
					},
					{
						name: 'UTC -04:00 America Toronto',
						value: 'america_slash_toronto',
					},
					{
						name: 'UTC -04:00 America Tortola',
						value: 'america_slash_tortola',
					},
					{
						name: 'UTC -04:00 America Virgin',
						value: 'america_slash_virgin',
					},
					{
						name: 'UTC -04:00 Brazil West',
						value: 'brazil_slash_west',
					},
					{
						name: 'UTC -04:00 Canada Eastern',
						value: 'canada_slash_eastern',
					},
					{
						name: 'UTC -04:00 Chile Continental',
						value: 'chile_slash_continental',
					},
					{
						name: 'UTC -04:00 US East-Indiana',
						value: 'us_slash_east_hyphen_indiana',
					},
					{
						name: 'UTC -04:00 US Eastern',
						value: 'us_slash_eastern',
					},
					{
						name: 'UTC -04:00 US Michigan',
						value: 'us_slash_michigan',
					},
					{
						name: 'UTC -05:00 America Atikokan',
						value: 'america_slash_atikokan',
					},
					{
						name: 'UTC -05:00 America Bahia Banderas',
						value: 'america_slash_bahia_banderas',
					},
					{
						name: 'UTC -05:00 America Bogota',
						value: 'america_slash_bogota',
					},
					{
						name: 'UTC -05:00 America Cancun',
						value: 'america_slash_cancun',
					},
					{
						name: 'UTC -05:00 America Cayman',
						value: 'america_slash_cayman',
					},
					{
						name: 'UTC -05:00 America Chicago',
						value: 'america_slash_chicago',
					},
					{
						name: 'UTC -05:00 America Coral Harbour',
						value: 'america_slash_coral_harbour',
					},
					{
						name: 'UTC -05:00 America Eirunepe',
						value: 'america_slash_eirunepe',
					},
					{
						name: 'UTC -05:00 America Guayaquil',
						value: 'america_slash_guayaquil',
					},
					{
						name: 'UTC -05:00 America Indiana (Knox)',
						value: 'america_slash_indiana_slash_knox',
					},
					{
						name: 'UTC -05:00 America Indiana (Tell City)',
						value: 'america_slash_indiana_slash_tell_city',
					},
					{
						name: 'UTC -05:00 America Jamaica',
						value: 'america_slash_jamaica',
					},
					{
						name: 'UTC -05:00 America Knox IN',
						value: 'america_slash_knox_in',
					},
					{
						name: 'UTC -05:00 America Lima',
						value: 'america_slash_lima',
					},
					{
						name: 'UTC -05:00 America Matamoros',
						value: 'america_slash_matamoros',
					},
					{
						name: 'UTC -05:00 America Menominee',
						value: 'america_slash_menominee',
					},
					{
						name: 'UTC -05:00 America Merida',
						value: 'america_slash_merida',
					},
					{
						name: 'UTC -05:00 America Mexico City',
						value: 'america_slash_mexico_city',
					},
					{
						name: 'UTC -05:00 America Monterrey',
						value: 'america_slash_monterrey',
					},
					{
						name: 'UTC -05:00 America North Dakota (Beulah)',
						value: 'america_slash_north_dakota_slash_beulah',
					},
					{
						name: 'UTC -05:00 America North Dakota (Center)',
						value: 'america_slash_north_dakota_slash_center',
					},
					{
						name: 'UTC -05:00 America North Dakota (New Salem)',
						value: 'america_slash_north_dakota_slash_new_salem',
					},
					{
						name: 'UTC -05:00 America Panama',
						value: 'america_slash_panama',
					},
					{
						name: 'UTC -05:00 America Porto Acre',
						value: 'america_slash_porto_acre',
					},
					{
						name: 'UTC -05:00 America Rainy River',
						value: 'america_slash_rainy_river',
					},
					{
						name: 'UTC -05:00 America Rankin Inlet',
						value: 'america_slash_rankin_inlet',
					},
					{
						name: 'UTC -05:00 America Resolute',
						value: 'america_slash_resolute',
					},
					{
						name: 'UTC -05:00 America Rio Branco',
						value: 'america_slash_rio_branco',
					},
					{
						name: 'UTC -05:00 America Winnipeg',
						value: 'america_slash_winnipeg',
					},
					{
						name: 'UTC -05:00 Brazil Acre',
						value: 'brazil_slash_acre',
					},
					{
						name: 'UTC -05:00 Canada Central',
						value: 'canada_slash_central',
					},
					{
						name: 'UTC -05:00 Mexico General',
						value: 'mexico_slash_general',
					},
					{
						name: 'UTC -05:00 US Central',
						value: 'us_slash_central',
					},
					{
						name: 'UTC -05:00 US Indiana-Starke',
						value: 'us_slash_indiana_hyphen_starke',
					},
					{
						name: 'UTC -06:00 America Belize',
						value: 'america_slash_belize',
					},
					{
						name: 'UTC -06:00 America Boise',
						value: 'america_slash_boise',
					},
					{
						name: 'UTC -06:00 America Cambridge Bay',
						value: 'america_slash_cambridge_bay',
					},
					{
						name: 'UTC -06:00 America Chihuahua',
						value: 'america_slash_chihuahua',
					},
					{
						name: 'UTC -06:00 America Costa Rica',
						value: 'america_slash_costa_rica',
					},
					{
						name: 'UTC -06:00 America Denver',
						value: 'america_slash_denver',
					},
					{
						name: 'UTC -06:00 America Edmonton',
						value: 'america_slash_edmonton',
					},
					{
						name: 'UTC -06:00 America El Salvador',
						value: 'america_slash_el_salvador',
					},
					{
						name: 'UTC -06:00 America Guatemala',
						value: 'america_slash_guatemala',
					},
					{
						name: 'UTC -06:00 America Inuvik',
						value: 'america_slash_inuvik',
					},
					{
						name: 'UTC -06:00 America Managua',
						value: 'america_slash_managua',
					},
					{
						name: 'UTC -06:00 America Mazatlan',
						value: 'america_slash_mazatlan',
					},
					{
						name: 'UTC -06:00 America Navajo',
						value: 'navajo',
					},
					{
						name: 'UTC -06:00 America Ojinaga',
						value: 'america_slash_ojinaga',
					},
					{
						name: 'UTC -06:00 America Regina',
						value: 'america_slash_regina',
					},
					{
						name: 'UTC -06:00 America Shiprock',
						value: 'america_slash_shiprock',
					},
					{
						name: 'UTC -06:00 America Swift Current',
						value: 'america_slash_swift_current',
					},
					{
						name: 'UTC -06:00 America Tegucigalpa',
						value: 'america_slash_tegucigalpa',
					},
					{
						name: 'UTC -06:00 America Yellowknife',
						value: 'america_slash_yellowknife',
					},
					{
						name: 'UTC -06:00 Canada Mountain',
						value: 'canada_slash_mountain',
					},
					{
						name: 'UTC -06:00 Canada Saskatchewan',
						value: 'canada_slash_saskatchewan',
					},
					{
						name: 'UTC -06:00 Chile EasterIsland',
						value: 'chile_slash_easterisland',
					},
					{
						name: 'UTC -06:00 Mexico BajaSur',
						value: 'mexico_slash_bajasur',
					},
					{
						name: 'UTC -06:00 Pacific Easter',
						value: 'pacific_slash_easter',
					},
					{
						name: 'UTC -06:00 Pacific Galapagos',
						value: 'pacific_slash_galapagos',
					},
					{
						name: 'UTC -06:00 US Mountain',
						value: 'us_slash_mountain',
					},
					{
						name: 'UTC -07:00 America Creston',
						value: 'america_slash_creston',
					},
					{
						name: 'UTC -07:00 America Dawson',
						value: 'america_slash_dawson',
					},
					{
						name: 'UTC -07:00 America Dawson Creek',
						value: 'america_slash_dawson_creek',
					},
					{
						name: 'UTC -07:00 America Ensenada',
						value: 'america_slash_ensenada',
					},
					{
						name: 'UTC -07:00 America Fort Nelson',
						value: 'america_slash_fort_nelson',
					},
					{
						name: 'UTC -07:00 America Hermosillo',
						value: 'america_slash_hermosillo',
					},
					{
						name: 'UTC -07:00 America Los Angeles',
						value: 'america_slash_los_angeles',
					},
					{
						name: 'UTC -07:00 America Phoenix',
						value: 'america_slash_phoenix',
					},
					{
						name: 'UTC -07:00 America Santa Isabel',
						value: 'america_slash_santa_isabel',
					},
					{
						name: 'UTC -07:00 America Tijuana',
						value: 'america_slash_tijuana',
					},
					{
						name: 'UTC -07:00 America Vancouver',
						value: 'america_slash_vancouver',
					},
					{
						name: 'UTC -07:00 America Whitehorse',
						value: 'america_slash_whitehorse',
					},
					{
						name: 'UTC -07:00 Canada Pacific',
						value: 'canada_slash_pacific',
					},
					{
						name: 'UTC -07:00 Canada Yukon',
						value: 'canada_slash_yukon',
					},
					{
						name: 'UTC -07:00 Mexico BajaNorte',
						value: 'mexico_slash_bajanorte',
					},
					{
						name: 'UTC -07:00 US Arizona',
						value: 'us_slash_arizona',
					},
					{
						name: 'UTC -07:00 US Pacific',
						value: 'us_slash_pacific',
					},
					{
						name: 'UTC -07:00 US Pacific-New',
						value: 'us_slash_pacific_hyphen_new',
					},
					{
						name: 'UTC -08:00 America Anchorage',
						value: 'america_slash_anchorage',
					},
					{
						name: 'UTC -08:00 America Juneau',
						value: 'america_slash_juneau',
					},
					{
						name: 'UTC -08:00 America Metlakatla',
						value: 'america_slash_metlakatla',
					},
					{
						name: 'UTC -08:00 America Nome',
						value: 'america_slash_nome',
					},
					{
						name: 'UTC -08:00 America Sitka',
						value: 'america_slash_sitka',
					},
					{
						name: 'UTC -08:00 America Yakutat',
						value: 'america_slash_yakutat',
					},
					{
						name: 'UTC -08:00 Pacific Pitcairn',
						value: 'pacific_slash_pitcairn',
					},
					{
						name: 'UTC -08:00 US Alaska',
						value: 'us_slash_alaska',
					},
					{
						name: 'UTC -09:00 America Adak',
						value: 'america_slash_adak',
					},
					{
						name: 'UTC -09:00 America Atka',
						value: 'america_slash_atka',
					},
					{
						name: 'UTC -09:00 Pacific Gambier',
						value: 'pacific_slash_gambier',
					},
					{
						name: 'UTC -09:00 US Aleutian',
						value: 'us_slash_aleutian',
					},
					{
						name: 'UTC -09:30 Pacific Marquesas',
						value: 'pacific_slash_marquesas',
					},
					{
						name: 'UTC -10:00 Pacific Honolulu',
						value: 'pacific_slash_honolulu',
					},
					{
						name: 'UTC -10:00 Pacific Johnston',
						value: 'pacific_slash_johnston',
					},
					{
						name: 'UTC -10:00 Pacific Rarotonga',
						value: 'pacific_slash_rarotonga',
					},
					{
						name: 'UTC -10:00 Pacific Tahiti',
						value: 'pacific_slash_tahiti',
					},
					{
						name: 'UTC -10:00 US Hawaii',
						value: 'us_slash_hawaii',
					},
					{
						name: 'UTC -11:00 Pacific Midway',
						value: 'pacific_slash_midway',
					},
					{
						name: 'UTC -11:00 Pacific Niue',
						value: 'pacific_slash_niue',
					},
					{
						name: 'UTC -11:00 Pacific Pago Pago',
						value: 'pacific_slash_pago_pago',
					},
					{
						name: 'UTC -11:00 Pacific Samoa',
						value: 'pacific_slash_samoa',
					},
					{
						name: 'UTC -11:00 US Samoa',
						value: 'us_slash_samoa',
					},
					{
						name: 'UTC +00:00 Africa Abidjan',
						value: 'africa_slash_abidjan',
					},
					{
						name: 'UTC +00:00 Africa Accra',
						value: 'africa_slash_accra',
					},
					{
						name: 'UTC +00:00 Africa Bamako',
						value: 'africa_slash_bamako',
					},
					{
						name: 'UTC +00:00 Africa Banjul',
						value: 'africa_slash_banjul',
					},
					{
						name: 'UTC +00:00 Africa Bissau',
						value: 'africa_slash_bissau',
					},
					{
						name: 'UTC +00:00 Africa Conakry',
						value: 'africa_slash_conakry',
					},
					{
						name: 'UTC +00:00 Africa Dakar',
						value: 'africa_slash_dakar',
					},
					{
						name: 'UTC +00:00 Africa Freetown',
						value: 'africa_slash_freetown',
					},
					{
						name: 'UTC +00:00 Africa Lome',
						value: 'africa_slash_lome',
					},
					{
						name: 'UTC +00:00 Africa Monrovia',
						value: 'africa_slash_monrovia',
					},
					{
						name: 'UTC +00:00 Africa Nouakchott',
						value: 'africa_slash_nouakchott',
					},
					{
						name: 'UTC +00:00 Africa Ouagadougou',
						value: 'africa_slash_ouagadougou',
					},
					{
						name: 'UTC +00:00 Africa Timbuktu',
						value: 'africa_slash_timbuktu',
					},
					{
						name: 'UTC +00:00 America Danmarkshavn',
						value: 'america_slash_danmarkshavn',
					},
					{
						name: 'UTC +00:00 America Scoresbysund',
						value: 'america_slash_scoresbysund',
					},
					{
						name: 'UTC +00:00 Atlantic Azores',
						value: 'atlantic_slash_azores',
					},
					{
						name: 'UTC +00:00 Atlantic Reykjavik',
						value: 'atlantic_slash_reykjavik',
					},
					{
						name: 'UTC +00:00 Atlantic St Helena',
						value: 'atlantic_slash_st_helena',
					},
					{
						name: 'UTC +00:00 Europe Iceland',
						value: 'iceland',
					},
					{
						name: 'UTC +01:00 Africa Algiers',
						value: 'africa_slash_algiers',
					},
					{
						name: 'UTC +01:00 Africa Bangui',
						value: 'africa_slash_bangui',
					},
					{
						name: 'UTC +01:00 Africa Brazzaville',
						value: 'africa_slash_brazzaville',
					},
					{
						name: 'UTC +01:00 Africa Casablanca',
						value: 'africa_slash_casablanca',
					},
					{
						name: 'UTC +01:00 Africa Douala',
						value: 'africa_slash_douala',
					},
					{
						name: 'UTC +01:00 Africa El Aaiun',
						value: 'africa_slash_el_aaiun',
					},
					{
						name: 'UTC +01:00 Africa Kinshasa',
						value: 'africa_slash_kinshasa',
					},
					{
						name: 'UTC +01:00 Africa Lagos',
						value: 'africa_slash_lagos',
					},
					{
						name: 'UTC +01:00 Africa Libreville',
						value: 'africa_slash_libreville',
					},
					{
						name: 'UTC +01:00 Africa Luanda',
						value: 'africa_slash_luanda',
					},
					{
						name: 'UTC +01:00 Africa Malabo',
						value: 'africa_slash_malabo',
					},
					{
						name: 'UTC +01:00 Africa Ndjamena',
						value: 'africa_slash_ndjamena',
					},
					{
						name: 'UTC +01:00 Africa Niamey',
						value: 'africa_slash_niamey',
					},
					{
						name: 'UTC +01:00 Africa Porto-Novo',
						value: 'africa_slash_porto_hyphen_novo',
					},
					{
						name: 'UTC +01:00 Africa Sao Tome',
						value: 'africa_slash_sao_tome',
					},
					{
						name: 'UTC +01:00 Africa Tunis',
						value: 'africa_slash_tunis',
					},
					{
						name: 'UTC +01:00 Atlantic Canary',
						value: 'atlantic_slash_canary',
					},
					{
						name: 'UTC +01:00 Atlantic Faeroe',
						value: 'atlantic_slash_faeroe',
					},
					{
						name: 'UTC +01:00 Atlantic Faroe',
						value: 'atlantic_slash_faroe',
					},
					{
						name: 'UTC +01:00 Atlantic Madeira',
						value: 'atlantic_slash_madeira',
					},
					{
						name: 'UTC +01:00 Europe Belfast',
						value: 'europe_slash_belfast',
					},
					{
						name: 'UTC +01:00 Europe Dublin',
						value: 'europe_slash_dublin',
					},
					{
						name: 'UTC +01:00 Europe Eire',
						value: 'eire',
					},
					{
						name: 'UTC +01:00 Europe Guernsey',
						value: 'europe_slash_guernsey',
					},
					{
						name: 'UTC +01:00 Europe Isle of Man',
						value: 'europe_slash_isle_of_man',
					},
					{
						name: 'UTC +01:00 Europe Jersey',
						value: 'europe_slash_jersey',
					},
					{
						name: 'UTC +01:00 Europe Lisbon',
						value: 'europe_slash_lisbon',
					},
					{
						name: 'UTC +01:00 Europe London',
						value: 'europe_slash_london',
					},
					{
						name: 'UTC +01:00 Europe Portugal',
						value: 'portugal',
					},
					{
						name: 'UTC +02:00 Africa Blantyre',
						value: 'africa_slash_blantyre',
					},
					{
						name: 'UTC +02:00 Africa Bujumbura',
						value: 'africa_slash_bujumbura',
					},
					{
						name: 'UTC +02:00 Africa Cairo',
						value: 'africa_slash_cairo',
					},
					{
						name: 'UTC +02:00 Africa Ceuta',
						value: 'africa_slash_ceuta',
					},
					{
						name: 'UTC +02:00 Africa Egypt',
						value: 'egypt',
					},
					{
						name: 'UTC +02:00 Africa Gaborone',
						value: 'africa_slash_gaborone',
					},
					{
						name: 'UTC +02:00 Africa Harare',
						value: 'africa_slash_harare',
					},
					{
						name: 'UTC +02:00 Africa Johannesburg',
						value: 'africa_slash_johannesburg',
					},
					{
						name: 'UTC +02:00 Africa Khartoum',
						value: 'africa_slash_khartoum',
					},
					{
						name: 'UTC +02:00 Africa Kigali',
						value: 'africa_slash_kigali',
					},
					{
						name: 'UTC +02:00 Africa Libya',
						value: 'libya',
					},
					{
						name: 'UTC +02:00 Africa Lubumbashi',
						value: 'africa_slash_lubumbashi',
					},
					{
						name: 'UTC +02:00 Africa Lusaka',
						value: 'africa_slash_lusaka',
					},
					{
						name: 'UTC +02:00 Africa Maputo',
						value: 'africa_slash_maputo',
					},
					{
						name: 'UTC +02:00 Africa Maseru',
						value: 'africa_slash_maseru',
					},
					{
						name: 'UTC +02:00 Africa Mbabane',
						value: 'africa_slash_mbabane',
					},
					{
						name: 'UTC +02:00 Africa Tripoli',
						value: 'africa_slash_tripoli',
					},
					{
						name: 'UTC +02:00 Africa Windhoek',
						value: 'africa_slash_windhoek',
					},
					{
						name: 'UTC +02:00 Antarctica Troll',
						value: 'antarctica_slash_troll',
					},
					{
						name: 'UTC +02:00 Arctic Longyearbyen',
						value: 'arctic_slash_longyearbyen',
					},
					{
						name: 'UTC +02:00 Atlantic Jan Mayen',
						value: 'atlantic_slash_jan_mayen',
					},
					{
						name: 'UTC +02:00 Europe Amsterdam',
						value: 'europe_slash_amsterdam',
					},
					{
						name: 'UTC +02:00 Europe Andorra',
						value: 'europe_slash_andorra',
					},
					{
						name: 'UTC +02:00 Europe Belgrade',
						value: 'europe_slash_belgrade',
					},
					{
						name: 'UTC +02:00 Europe Berlin',
						value: 'europe_slash_berlin',
					},
					{
						name: 'UTC +02:00 Europe Bratislava',
						value: 'europe_slash_bratislava',
					},
					{
						name: 'UTC +02:00 Europe Brussels',
						value: 'europe_slash_brussels',
					},
					{
						name: 'UTC +02:00 Europe Budapest',
						value: 'europe_slash_budapest',
					},
					{
						name: 'UTC +02:00 Europe Busingen',
						value: 'europe_slash_busingen',
					},
					{
						name: 'UTC +02:00 Europe Copenhagen',
						value: 'europe_slash_copenhagen',
					},
					{
						name: 'UTC +02:00 Europe Gibraltar',
						value: 'europe_slash_gibraltar',
					},
					{
						name: 'UTC +02:00 Europe Kaliningrad',
						value: 'europe_slash_kaliningrad',
					},
					{
						name: 'UTC +02:00 Europe Ljubljana',
						value: 'europe_slash_ljubljana',
					},
					{
						name: 'UTC +02:00 Europe Luxembourg',
						value: 'europe_slash_luxembourg',
					},
					{
						name: 'UTC +02:00 Europe Madrid',
						value: 'europe_slash_madrid',
					},
					{
						name: 'UTC +02:00 Europe Malta',
						value: 'europe_slash_malta',
					},
					{
						name: 'UTC +02:00 Europe Monaco',
						value: 'europe_slash_monaco',
					},
					{
						name: 'UTC +02:00 Europe Oslo',
						value: 'europe_slash_oslo',
					},
					{
						name: 'UTC +02:00 Europe Paris',
						value: 'europe_slash_paris',
					},
					{
						name: 'UTC +02:00 Europe Podgorica',
						value: 'europe_slash_podgorica',
					},
					{
						name: 'UTC +02:00 Europe Poland',
						value: 'poland',
					},
					{
						name: 'UTC +02:00 Europe Prague',
						value: 'europe_slash_prague',
					},
					{
						name: 'UTC +02:00 Europe Rome',
						value: 'europe_slash_rome',
					},
					{
						name: 'UTC +02:00 Europe San Marino',
						value: 'europe_slash_san_marino',
					},
					{
						name: 'UTC +02:00 Europe Sarajevo',
						value: 'europe_slash_sarajevo',
					},
					{
						name: 'UTC +02:00 Europe Skopje',
						value: 'europe_slash_skopje',
					},
					{
						name: 'UTC +02:00 Europe Stockholm',
						value: 'europe_slash_stockholm',
					},
					{
						name: 'UTC +02:00 Europe Tirane',
						value: 'europe_slash_tirane',
					},
					{
						name: 'UTC +02:00 Europe Vaduz',
						value: 'europe_slash_vaduz',
					},
					{
						name: 'UTC +02:00 Europe Vatican',
						value: 'europe_slash_vatican',
					},
					{
						name: 'UTC +02:00 Europe Vienna',
						value: 'europe_slash_vienna',
					},
					{
						name: 'UTC +02:00 Europe Warsaw',
						value: 'europe_slash_warsaw',
					},
					{
						name: 'UTC +02:00 Europe Zagreb',
						value: 'europe_slash_zagreb',
					},
					{
						name: 'UTC +02:00 Europe Zurich',
						value: 'europe_slash_zurich',
					},
					{
						name: 'UTC +03:00 Africa Addis Ababa',
						value: 'africa_slash_addis_ababa',
					},
					{
						name: 'UTC +03:00 Africa Asmara',
						value: 'africa_slash_asmara',
					},
					{
						name: 'UTC +03:00 Africa Asmera',
						value: 'africa_slash_asmera',
					},
					{
						name: 'UTC +03:00 Africa Dar Es Salaam',
						value: 'africa_slash_dar_es_salaam',
					},
					{
						name: 'UTC +03:00 Africa Djibouti',
						value: 'africa_slash_djibouti',
					},
					{
						name: 'UTC +03:00 Africa Juba',
						value: 'africa_slash_juba',
					},
					{
						name: 'UTC +03:00 Africa Kampala',
						value: 'africa_slash_kampala',
					},
					{
						name: 'UTC +03:00 Africa Mogadishu',
						value: 'africa_slash_mogadishu',
					},
					{
						name: 'UTC +03:00 Africa Nairobi',
						value: 'africa_slash_nairobi',
					},
					{
						name: 'UTC +03:00 Antarctica Syowa',
						value: 'antarctica_slash_syowa',
					},
					{
						name: 'UTC +03:00 Asia Aden',
						value: 'asia_slash_aden',
					},
					{
						name: 'UTC +03:00 Asia Amman',
						value: 'asia_slash_amman',
					},
					{
						name: 'UTC +03:00 Asia Baghdad',
						value: 'asia_slash_baghdad',
					},
					{
						name: 'UTC +03:00 Asia Bahrain',
						value: 'asia_slash_bahrain',
					},
					{
						name: 'UTC +03:00 Asia Beirut',
						value: 'asia_slash_beirut',
					},
					{
						name: 'UTC +03:00 Asia Damascus',
						value: 'asia_slash_damascus',
					},
					{
						name: 'UTC +03:00 Asia Famagusta',
						value: 'asia_slash_famagusta',
					},
					{
						name: 'UTC +03:00 Asia Gaza',
						value: 'asia_slash_gaza',
					},
					{
						name: 'UTC +03:00 Asia Hebron',
						value: 'asia_slash_hebron',
					},
					{
						name: 'UTC +03:00 Asia Israel',
						value: 'israel',
					},
					{
						name: 'UTC +03:00 Asia Istanbul',
						value: 'asia_slash_istanbul',
					},
					{
						name: 'UTC +03:00 Asia Jerusalem',
						value: 'asia_slash_jerusalem',
					},
					{
						name: 'UTC +03:00 Asia Kuwait',
						value: 'asia_slash_kuwait',
					},
					{
						name: 'UTC +03:00 Asia Nicosia',
						value: 'asia_slash_nicosia',
					},
					{
						name: 'UTC +03:00 Asia Qatar',
						value: 'asia_slash_qatar',
					},
					{
						name: 'UTC +03:00 Asia Riyadh',
						value: 'asia_slash_riyadh',
					},
					{
						name: 'UTC +03:00 Asia Tel Aviv',
						value: 'asia_slash_tel_aviv',
					},
					{
						name: 'UTC +03:00 Asia Türkiye',
						value: 'turkey',
					},
					{
						name: 'UTC +03:00 Europe Athens',
						value: 'europe_slash_athens',
					},
					{
						name: 'UTC +03:00 Europe Bucharest',
						value: 'europe_slash_bucharest',
					},
					{
						name: 'UTC +03:00 Europe Chisinau',
						value: 'europe_slash_chisinau',
					},
					{
						name: 'UTC +03:00 Europe Helsinki',
						value: 'europe_slash_helsinki',
					},
					{
						name: 'UTC +03:00 Europe Istanbul',
						value: 'europe_slash_istanbul',
					},
					{
						name: 'UTC +03:00 Europe Kirov',
						value: 'europe_slash_kirov',
					},
					{
						name: 'UTC +03:00 Europe Kyiv',
						value: 'europe_slash_kiev',
					},
					{
						name: 'UTC +03:00 Europe Mariehamn',
						value: 'europe_slash_mariehamn',
					},
					{
						name: 'UTC +03:00 Europe Minsk',
						value: 'europe_slash_minsk',
					},
					{
						name: 'UTC +03:00 Europe Moscow',
						value: 'europe_slash_moscow',
					},
					{
						name: 'UTC +03:00 Europe Nicosia',
						value: 'europe_slash_nicosia',
					},
					{
						name: 'UTC +03:00 Europe Riga',
						value: 'europe_slash_riga',
					},
					{
						name: 'UTC +03:00 Europe Simferopol',
						value: 'europe_slash_simferopol',
					},
					{
						name: 'UTC +03:00 Europe Sofia',
						value: 'europe_slash_sofia',
					},
					{
						name: 'UTC +03:00 Europe Tallinn',
						value: 'europe_slash_tallinn',
					},
					{
						name: 'UTC +03:00 Europe Tiraspol',
						value: 'europe_slash_tiraspol',
					},
					{
						name: 'UTC +03:00 Europe Uzhgorod',
						value: 'europe_slash_uzhgorod',
					},
					{
						name: 'UTC +03:00 Europe Vilnius',
						value: 'europe_slash_vilnius',
					},
					{
						name: 'UTC +03:00 Europe Zaporizhzhia',
						value: 'europe_slash_zaporozhye',
					},
					{
						name: 'UTC +03:00 Indian Antananarivo',
						value: 'indian_slash_antananarivo',
					},
					{
						name: 'UTC +03:00 Indian Comoro',
						value: 'indian_slash_comoro',
					},
					{
						name: 'UTC +03:00 Indian Mayotte',
						value: 'indian_slash_mayotte',
					},
					{
						name: 'UTC +04:00 Asia Baku',
						value: 'asia_slash_baku',
					},
					{
						name: 'UTC +04:00 Asia Dubai',
						value: 'asia_slash_dubai',
					},
					{
						name: 'UTC +04:00 Asia Muscat',
						value: 'asia_slash_muscat',
					},
					{
						name: 'UTC +04:00 Asia Tbilisi',
						value: 'asia_slash_tbilisi',
					},
					{
						name: 'UTC +04:00 Asia Yerevan',
						value: 'asia_slash_yerevan',
					},
					{
						name: 'UTC +04:00 Europe Astrakhan',
						value: 'europe_slash_astrakhan',
					},
					{
						name: 'UTC +04:00 Europe Samara',
						value: 'europe_slash_samara',
					},
					{
						name: 'UTC +04:00 Europe Saratov',
						value: 'europe_slash_saratov',
					},
					{
						name: 'UTC +04:00 Europe Ulyanovsk',
						value: 'europe_slash_ulyanovsk',
					},
					{
						name: 'UTC +04:00 Europe Volgograd',
						value: 'europe_slash_volgograd',
					},
					{
						name: 'UTC +04:00 Indian Mahe',
						value: 'indian_slash_mahe',
					},
					{
						name: 'UTC +04:00 Indian Mauritius',
						value: 'indian_slash_mauritius',
					},
					{
						name: 'UTC +04:00 Indian Reunion',
						value: 'indian_slash_reunion',
					},
					{
						name: 'UTC +04:30 Asia Iran',
						value: 'iran',
					},
					{
						name: 'UTC +04:30 Asia Kabul',
						value: 'asia_slash_kabul',
					},
					{
						name: 'UTC +04:30 Asia Tehran',
						value: 'asia_slash_tehran',
					},
					{
						name: 'UTC +05:00 Antarctica Mawson',
						value: 'antarctica_slash_mawson',
					},
					{
						name: 'UTC +05:00 Asia Aqtau',
						value: 'asia_slash_aqtau',
					},
					{
						name: 'UTC +05:00 Asia Aqtobe',
						value: 'asia_slash_aqtobe',
					},
					{
						name: 'UTC +05:00 Asia Ashgabat',
						value: 'asia_slash_ashgabat',
					},
					{
						name: 'UTC +05:00 Asia Ashkhabad',
						value: 'asia_slash_ashkhabad',
					},
					{
						name: 'UTC +05:00 Asia Atyrau',
						value: 'asia_slash_atyrau',
					},
					{
						name: 'UTC +05:00 Asia Dushanbe',
						value: 'asia_slash_dushanbe',
					},
					{
						name: 'UTC +05:00 Asia Karachi',
						value: 'asia_slash_karachi',
					},
					{
						name: 'UTC +05:00 Asia Oral',
						value: 'asia_slash_oral',
					},
					{
						name: 'UTC +05:00 Asia Samarkand',
						value: 'asia_slash_samarkand',
					},
					{
						name: 'UTC +05:00 Asia Tashkent',
						value: 'asia_slash_tashkent',
					},
					{
						name: 'UTC +05:00 Asia Yekaterinburg',
						value: 'asia_slash_yekaterinburg',
					},
					{
						name: 'UTC +05:00 Indian Kerguelen',
						value: 'indian_slash_kerguelen',
					},
					{
						name: 'UTC +05:00 Indian Maldives',
						value: 'indian_slash_maldives',
					},
					{
						name: 'UTC +05:30 Asia Calcutta',
						value: 'asia_slash_calcutta',
					},
					{
						name: 'UTC +05:30 Asia Colombo',
						value: 'asia_slash_colombo',
					},
					{
						name: 'UTC +05:30 Asia Kolkata',
						value: 'asia_slash_kolkata',
					},
					{
						name: 'UTC +05:45 Asia Kathmandu',
						value: 'asia_slash_kathmandu',
					},
					{
						name: 'UTC +05:45 Asia Katmandu',
						value: 'asia_slash_katmandu',
					},
					{
						name: 'UTC +06:00 Antarctica Vostok',
						value: 'antarctica_slash_vostok',
					},
					{
						name: 'UTC +06:00 Asia Almaty',
						value: 'asia_slash_almaty',
					},
					{
						name: 'UTC +06:00 Asia Bishkek',
						value: 'asia_slash_bishkek',
					},
					{
						name: 'UTC +06:00 Asia Dacca',
						value: 'asia_slash_dacca',
					},
					{
						name: 'UTC +06:00 Asia Dhaka',
						value: 'asia_slash_dhaka',
					},
					{
						name: 'UTC +06:00 Asia Kashgar',
						value: 'asia_slash_kashgar',
					},
					{
						name: 'UTC +06:00 Asia Omsk',
						value: 'asia_slash_omsk',
					},
					{
						name: 'UTC +06:00 Asia Qyzylorda',
						value: 'asia_slash_qyzylorda',
					},
					{
						name: 'UTC +06:00 Asia Thimbu',
						value: 'asia_slash_thimbu',
					},
					{
						name: 'UTC +06:00 Asia Thimphu',
						value: 'asia_slash_thimphu',
					},
					{
						name: 'UTC +06:00 Asia Urumqi',
						value: 'asia_slash_urumqi',
					},
					{
						name: 'UTC +06:00 Indian Chagos',
						value: 'indian_slash_chagos',
					},
					{
						name: 'UTC +06:30 Asia Rangoon',
						value: 'asia_slash_rangoon',
					},
					{
						name: 'UTC +06:30 Asia Yangon',
						value: 'asia_slash_yangon',
					},
					{
						name: 'UTC +06:30 Indian Cocos',
						value: 'indian_slash_cocos',
					},
					{
						name: 'UTC +07:00 Antarctica Davis',
						value: 'antarctica_slash_davis',
					},
					{
						name: 'UTC +07:00 Asia Bangkok',
						value: 'asia_slash_bangkok',
					},
					{
						name: 'UTC +07:00 Asia Barnaul',
						value: 'asia_slash_barnaul',
					},
					{
						name: 'UTC +07:00 Asia Ho Chi Minh',
						value: 'asia_slash_ho_chi_minh',
					},
					{
						name: 'UTC +07:00 Asia Hovd',
						value: 'asia_slash_hovd',
					},
					{
						name: 'UTC +07:00 Asia Jakarta',
						value: 'asia_slash_jakarta',
					},
					{
						name: 'UTC +07:00 Asia Krasnoyarsk',
						value: 'asia_slash_krasnoyarsk',
					},
					{
						name: 'UTC +07:00 Asia Novokuznetsk',
						value: 'asia_slash_novokuznetsk',
					},
					{
						name: 'UTC +07:00 Asia Novosibirsk',
						value: 'asia_slash_novosibirsk',
					},
					{
						name: 'UTC +07:00 Asia Phnom Penh',
						value: 'asia_slash_phnom_penh',
					},
					{
						name: 'UTC +07:00 Asia Pontianak',
						value: 'asia_slash_pontianak',
					},
					{
						name: 'UTC +07:00 Asia Saigon',
						value: 'asia_slash_saigon',
					},
					{
						name: 'UTC +07:00 Asia Tomsk',
						value: 'asia_slash_tomsk',
					},
					{
						name: 'UTC +07:00 Asia Vientiane',
						value: 'asia_slash_vientiane',
					},
					{
						name: 'UTC +07:00 Indian Christmas',
						value: 'indian_slash_christmas',
					},
					{
						name: 'UTC +08:00 Antarctica Casey',
						value: 'antarctica_slash_casey',
					},
					{
						name: 'UTC +08:00 Asia Brunei',
						value: 'asia_slash_brunei',
					},
					{
						name: 'UTC +08:00 Asia Choibalsan',
						value: 'asia_slash_choibalsan',
					},
					{
						name: 'UTC +08:00 Asia Chongqing',
						value: 'asia_slash_chongqing',
					},
					{
						name: 'UTC +08:00 Asia Chungking',
						value: 'asia_slash_chungking',
					},
					{
						name: 'UTC +08:00 Asia Harbin',
						value: 'asia_slash_harbin',
					},
					{
						name: 'UTC +08:00 Asia Hong Kong',
						value: 'asia_slash_hong_kong',
					},
					{
						name: 'UTC +08:00 Asia Irkutsk',
						value: 'asia_slash_irkutsk',
					},
					{
						name: 'UTC +08:00 Asia Kuala Lumpur',
						value: 'asia_slash_kuala_lumpur',
					},
					{
						name: 'UTC +08:00 Asia Kuching',
						value: 'asia_slash_kuching',
					},
					{
						name: 'UTC +08:00 Asia Macao',
						value: 'asia_slash_macao',
					},
					{
						name: 'UTC +08:00 Asia Macau',
						value: 'asia_slash_macau',
					},
					{
						name: 'UTC +08:00 Asia Makassar',
						value: 'asia_slash_makassar',
					},
					{
						name: 'UTC +08:00 Asia Manila',
						value: 'asia_slash_manila',
					},
					{
						name: 'UTC +08:00 Asia Shanghai',
						value: 'asia_slash_shanghai',
					},
					{
						name: 'UTC +08:00 Asia Singapore',
						value: 'asia_slash_singapore',
					},
					{
						name: 'UTC +08:00 Asia Taipei',
						value: 'asia_slash_taipei',
					},
					{
						name: 'UTC +08:00 Asia Ujung Pandang',
						value: 'asia_slash_ujung_pandang',
					},
					{
						name: 'UTC +08:00 Asia Ulaanbaatar',
						value: 'asia_slash_ulaanbaatar',
					},
					{
						name: 'UTC +08:00 Asia Ulan Bator',
						value: 'asia_slash_ulan_bator',
					},
					{
						name: 'UTC +08:00 Australia Perth',
						value: 'australia_slash_perth',
					},
					{
						name: 'UTC +08:00 Australia West',
						value: 'australia_slash_west',
					},
					{
						name: 'UTC +08:45 Australia Eucla',
						value: 'australia_slash_eucla',
					},
					{
						name: 'UTC +09:00 Asia Chita',
						value: 'asia_slash_chita',
					},
					{
						name: 'UTC +09:00 Asia Dili',
						value: 'asia_slash_dili',
					},
					{
						name: 'UTC +09:00 Asia Japan',
						value: 'japan',
					},
					{
						name: 'UTC +09:00 Asia Jayapura',
						value: 'asia_slash_jayapura',
					},
					{
						name: 'UTC +09:00 Asia Khandyga',
						value: 'asia_slash_khandyga',
					},
					{
						name: 'UTC +09:00 Asia Pyongyang',
						value: 'asia_slash_pyongyang',
					},
					{
						name: 'UTC +09:00 Asia Seoul',
						value: 'asia_slash_seoul',
					},
					{
						name: 'UTC +09:00 Asia Tokyo',
						value: 'asia_slash_tokyo',
					},
					{
						name: 'UTC +09:00 Asia Yakutsk',
						value: 'asia_slash_yakutsk',
					},
					{
						name: 'UTC +09:00 Pacific Palau',
						value: 'pacific_slash_palau',
					},
					{
						name: 'UTC +09:30 Australia Adelaide',
						value: 'australia_slash_adelaide',
					},
					{
						name: 'UTC +09:30 Australia Broken Hill',
						value: 'australia_slash_broken_hill',
					},
					{
						name: 'UTC +09:30 Australia Darwin',
						value: 'australia_slash_darwin',
					},
					{
						name: 'UTC +09:30 Australia North',
						value: 'australia_slash_north',
					},
					{
						name: 'UTC +09:30 Australia South',
						value: 'australia_slash_south',
					},
					{
						name: 'UTC +09:30 Australia Yancowinna',
						value: 'australia_slash_yancowinna',
					},
					{
						name: 'UTC +10:00 Antarctica DumontDUrville',
						value: 'antarctica_slash_dumontdurville',
					},
					{
						name: 'UTC +10:00 Asia Ust-Nera',
						value: 'asia_slash_ust_hyphen_nera',
					},
					{
						name: 'UTC +10:00 Asia Vladivostok',
						value: 'asia_slash_vladivostok',
					},
					{
						name: 'UTC +10:00 Australia ACT',
						value: 'australia_slash_act',
					},
					{
						name: 'UTC +10:00 Australia Brisbane',
						value: 'australia_slash_brisbane',
					},
					{
						name: 'UTC +10:00 Australia Canberra',
						value: 'australia_slash_canberra',
					},
					{
						name: 'UTC +10:00 Australia Currie',
						value: 'australia_slash_currie',
					},
					{
						name: 'UTC +10:00 Australia Hobart',
						value: 'australia_slash_hobart',
					},
					{
						name: 'UTC +10:00 Australia Lindeman',
						value: 'australia_slash_lindeman',
					},
					{
						name: 'UTC +10:00 Australia Melbourne',
						value: 'australia_slash_melbourne',
					},
					{
						name: 'UTC +10:00 Australia NSW',
						value: 'australia_slash_nsw',
					},
					{
						name: 'UTC +10:00 Australia Queensland',
						value: 'australia_slash_queensland',
					},
					{
						name: 'UTC +10:00 Australia Sydney',
						value: 'australia_slash_sydney',
					},
					{
						name: 'UTC +10:00 Australia Tasmania',
						value: 'australia_slash_tasmania',
					},
					{
						name: 'UTC +10:00 Australia Victoria',
						value: 'australia_slash_victoria',
					},
					{
						name: 'UTC +10:00 Pacific Chuuk',
						value: 'pacific_slash_chuuk',
					},
					{
						name: 'UTC +10:00 Pacific Guam',
						value: 'pacific_slash_guam',
					},
					{
						name: 'UTC +10:00 Pacific Port Moresby',
						value: 'pacific_slash_port_moresby',
					},
					{
						name: 'UTC +10:00 Pacific Saipan',
						value: 'pacific_slash_saipan',
					},
					{
						name: 'UTC +10:00 Pacific Truk',
						value: 'pacific_slash_truk',
					},
					{
						name: 'UTC +10:00 Pacific Yap',
						value: 'pacific_slash_yap',
					},
					{
						name: 'UTC +10:30 Australia LHI',
						value: 'australia_slash_lhi',
					},
					{
						name: 'UTC +10:30 Australia Lord Howe',
						value: 'australia_slash_lord_howe',
					},
					{
						name: 'UTC +11:00 Antarctica Macquarie',
						value: 'antarctica_slash_macquarie',
					},
					{
						name: 'UTC +11:00 Asia Magadan',
						value: 'asia_slash_magadan',
					},
					{
						name: 'UTC +11:00 Asia Sakhalin',
						value: 'asia_slash_sakhalin',
					},
					{
						name: 'UTC +11:00 Asia Srednekolymsk',
						value: 'asia_slash_srednekolymsk',
					},
					{
						name: 'UTC +11:00 Pacific Bougainville',
						value: 'pacific_slash_bougainville',
					},
					{
						name: 'UTC +11:00 Pacific Efate',
						value: 'pacific_slash_efate',
					},
					{
						name: 'UTC +11:00 Pacific Guadalcanal',
						value: 'pacific_slash_guadalcanal',
					},
					{
						name: 'UTC +11:00 Pacific Kosrae',
						value: 'pacific_slash_kosrae',
					},
					{
						name: 'UTC +11:00 Pacific Norfolk',
						value: 'pacific_slash_norfolk',
					},
					{
						name: 'UTC +11:00 Pacific Noumea',
						value: 'pacific_slash_noumea',
					},
					{
						name: 'UTC +11:00 Pacific Pohnpei',
						value: 'pacific_slash_pohnpei',
					},
					{
						name: 'UTC +11:00 Pacific Ponape',
						value: 'pacific_slash_ponape',
					},
					{
						name: 'UTC +12:00 Antarctica McMurdo',
						value: 'antarctica_slash_mcmurdo',
					},
					{
						name: 'UTC +12:00 Antarctica South Pole',
						value: 'antarctica_slash_south_pole',
					},
					{
						name: 'UTC +12:00 Asia Anadyr',
						value: 'asia_slash_anadyr',
					},
					{
						name: 'UTC +12:00 Asia Kamchatka',
						value: 'asia_slash_kamchatka',
					},
					{
						name: 'UTC +12:00 Pacific Auckland',
						value: 'pacific_slash_auckland',
					},
					{
						name: 'UTC +12:00 Pacific Fiji',
						value: 'pacific_slash_fiji',
					},
					{
						name: 'UTC +12:00 Pacific Funafuti',
						value: 'pacific_slash_funafuti',
					},
					{
						name: 'UTC +12:00 Pacific Kwajalein',
						value: 'kwajalein',
					},
					{
						name: 'UTC +12:00 Pacific Majuro',
						value: 'pacific_slash_majuro',
					},
					{
						name: 'UTC +12:00 Pacific Nauru',
						value: 'pacific_slash_nauru',
					},
					{
						name: 'UTC +12:00 Pacific Tarawa',
						value: 'pacific_slash_tarawa',
					},
					{
						name: 'UTC +12:00 Pacific Wake',
						value: 'pacific_slash_wake',
					},
					{
						name: 'UTC +12:00 Pacific Wallis',
						value: 'pacific_slash_wallis',
					},
					{
						name: 'UTC +12:45 Pacific Chatham',
						value: 'pacific_slash_chatham',
					},
					{
						name: 'UTC +13:00 Pacific Apia',
						value: 'pacific_slash_apia',
					},
					{
						name: 'UTC +13:00 Pacific Enderbury',
						value: 'pacific_slash_enderbury',
					},
					{
						name: 'UTC +13:00 Pacific Fakaofo',
						value: 'pacific_slash_fakaofo',
					},
					{
						name: 'UTC +13:00 Pacific Tongatapu',
						value: 'pacific_slash_tongatapu',
					},
					{
						name: 'UTC +14:00 Pacific Kiritimati',
						value: 'pacific_slash_kiritimati',
					},
				],
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
				displayName: 'WhatsApp Phone Number',
				name: 'whatsappPhoneNumber',
				description: 'The phone number associated with the contact’s WhatsApp account',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Work Email',
				name: 'workEmail',
				type: 'string',
				default: '',
				description:
					"A contact's work email. This property is required for the Facebook Ads Integration. This property will be automatically synced via the Lead Ads tool",
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
