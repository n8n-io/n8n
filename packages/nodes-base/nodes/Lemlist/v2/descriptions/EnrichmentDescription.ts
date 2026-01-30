import type { INodeProperties } from 'n8n-workflow';

export const enrichmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Bulk Enrich',
				value: 'bulkEnrich',
				description: 'Enrich multiple entities at once (up to 500)',
				action: 'Bulk enrich entities',
			},
			{
				name: 'Enrich Lead',
				value: 'enrichLead',
				description: 'Enrich a lead using an email or LinkedIn URL',
				action: 'Enrich a lead',
			},
			{
				name: 'Enrich Person',
				value: 'enrichPerson',
				description: 'Enrich a person using an email or LinkedIn URL',
				action: 'Enrich a person',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Fetch a previously completed enrichment',
				action: 'Get an enrichment',
			},
		],
		displayOptions: {
			show: {
				resource: ['enrich'],
			},
		},
	},
];

export const enrichmentFields: INodeProperties[] = [
	// ----------------------------------
	//        enrichment: get
	// ----------------------------------
	{
		displayName: 'Enrichment ID',
		name: 'enrichId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the enrichment to retrieve',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//        enrichment: enrichLead
	// ----------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichLead'],
			},
		},
	},
	{
		displayName: 'Find Email',
		name: 'findEmail',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichLead', 'enrichPerson'],
			},
		},
	},
	{
		displayName: 'Verify Email',
		name: 'verifyEmail',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichLead', 'enrichPerson'],
			},
		},
	},
	{
		displayName: 'LinkedIn Enrichment',
		name: 'linkedinEnrichment',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichLead', 'enrichPerson'],
			},
		},
	},
	{
		displayName: 'Find Phone',
		name: 'findPhone',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichLead', 'enrichPerson'],
			},
		},
	},

	// ----------------------------------
	//        enrichment: enrichPerson
	// ----------------------------------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichPerson'],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------
	//        enrichment: bulkEnrich
	// ----------------------------------
	{
		displayName: 'Entities',
		name: 'entities',
		type: 'json',
		default: '[]',
		required: true,
		description:
			'JSON array of entities to enrich (up to 500). Each entity should contain email, firstName, lastName, linkedinUrl, companyName, or companyDomain.',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['bulkEnrich'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['bulkEnrich'],
			},
		},
		options: [
			{
				displayName: 'Find Email',
				name: 'findEmail',
				type: 'boolean',
				default: false,
				description: 'Whether to find verified email for each entity',
			},
			{
				displayName: 'Verify Email',
				name: 'verifyEmail',
				type: 'boolean',
				default: false,
				description: 'Whether to verify existing email for each entity',
			},
			{
				displayName: 'LinkedIn Enrichment',
				name: 'linkedinEnrichment',
				type: 'boolean',
				default: false,
				description: 'Whether to run LinkedIn enrichment for each entity',
			},
			{
				displayName: 'Find Phone',
				name: 'findPhone',
				type: 'boolean',
				default: false,
				description: 'Whether to find phone number for each entity',
			},
		],
	},
];
