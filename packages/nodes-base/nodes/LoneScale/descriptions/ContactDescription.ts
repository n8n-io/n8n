import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Enrich',
				value: 'enrich',
				description: 'Enrich a contact with email, phone and/or profile data',
				action: 'Enrich a contact',
			},
			{
				name: 'Source',
				value: 'source',
				description: 'Source contacts from a company matching personas',
				action: 'Source contacts from a company',
			},
		],
		default: 'enrich',
		noDataExpression: true,
	},
];

export const contactFields: INodeProperties[] = [
	{
		displayName: 'Enrichment Type',
		name: 'enrichmentType',
		type: 'multiOptions',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['enrich'],
			},
		},
		options: [
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Phone',
				value: 'phone',
			},
			{
				name: 'Profile',
				value: 'profile',
			},
		],
		default: ['email'],
		description: 'Types of enrichment to perform',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['enrich'],
			},
		},
		default: '',
		description: 'Contact first name',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['enrich'],
			},
		},
		default: '',
		description: 'Contact last name',
	},
	{
		displayName: 'Company Name',
		name: 'enrichCompanyName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['enrich'],
			},
		},
		default: '',
		description: 'Contact company name, improves matching accuracy',
	},
	{
		displayName: 'Company Domain',
		name: 'enrichCompanyDomain',
		type: 'string',
		placeholder: 'acme.com',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['enrich'],
			},
		},
		default: '',
		description: 'Contact company domain, improves matching accuracy',
	},
	{
		displayName: 'Detect Job Change',
		name: 'detectJobChange',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['enrich'],
			},
		},
		default: false,
		description:
			'Whether to flag if the contact changed company since the input data. Only effective when Enrichment Type includes Profile.',
	},
	{
		displayName: 'Additional Fields',
		name: 'enrichAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['enrich'],
			},
		},
		options: [
			{
				displayName: 'Contact Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Known contact email to improve matching',
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				description: 'Your CRM record ID, echoed back in the response',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'Contact job title',
			},
			{
				displayName: 'Linkedin URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				description: 'Contact Linkedin URL',
			},
		],
	},
	{
		displayName: 'Company Domain',
		name: 'sourceCompanyDomain',
		type: 'string',
		placeholder: 'acme.com',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['source'],
			},
		},
		default: '',
		description:
			'Company domain to source contacts from. Provide at least one of domain, name or Linkedin URL.',
	},
	{
		displayName: 'Company Name',
		name: 'sourceCompanyName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['source'],
			},
		},
		default: '',
		description: 'Company name to source contacts from',
	},
	{
		displayName: 'Company Linkedin URL',
		name: 'sourceCompanyLinkedinUrl',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['source'],
			},
		},
		default: '',
		description: 'Company Linkedin URL, increases coverage and accuracy by 25%',
	},
	{
		displayName: 'Personas',
		name: 'personas',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['source'],
			},
		},
		default: {},
		placeholder: 'Add Persona',
		options: [
			{
				name: 'persona',
				displayName: 'Persona',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'A label for this persona',
						required: true,
					},
					{
						displayName: 'Job Titles',
						name: 'jobTitles',
						type: 'string',
						default: '',
						placeholder: 'CEO, Head of Sales, VP Marketing',
						description: 'Comma-separated job titles to match',
						required: true,
					},
					{
						displayName: 'Exclude Job Titles',
						name: 'excludeJobTitles',
						type: 'string',
						default: '',
						placeholder: 'Assistant, Intern',
						description: 'Comma-separated job titles to exclude',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'sourceAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['source'],
			},
		},
		options: [
			{
				displayName: 'Disable Company Info',
				name: 'disableCompanyInfo',
				type: 'boolean',
				default: false,
				description:
					'Whether to skip enrichment of company information (industry, size, etc.) for each contact',
			},
			{
				displayName: 'Included Locations',
				name: 'includedLocations',
				type: 'string',
				default: '',
				placeholder: 'US, FR, GB',
				description: 'Comma-separated ISO 3166-1 alpha-2 country codes to include',
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: 10,
				description: 'Maximum number of contacts to retrieve (capped at 10)',
			},
			{
				displayName: 'Seniority Levels',
				name: 'seniorityLevels',
				type: 'multiOptions',
				options: [
					{
						name: 'C-Suite',
						value: 'c-suite',
					},
					{
						name: 'Director',
						value: 'director',
					},
					{
						name: 'Entry',
						value: 'entry',
					},
					{
						name: 'Founder',
						value: 'founder',
					},
					{
						name: 'Head',
						value: 'head',
					},
					{
						name: 'Intern',
						value: 'intern',
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
				default: [],
				description: 'Filter contacts by seniority level',
			},
		],
	},
];
