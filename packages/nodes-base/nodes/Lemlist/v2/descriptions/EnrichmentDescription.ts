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
				name: 'Get',
				value: 'get',
				action: 'Fetches a previously completed enrichment',
			},
			{
				name: 'Enrich Lead',
				value: 'enrichLead',
				action: 'Enrich a lead using an email or LinkedIn URL',
			},
			{
				name: 'Enrich Person',
				value: 'enrichPerson',
				action: 'Enrich a person using an email or LinkedIn URL',
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
		displayName: 'Linkedin Enrichment',
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
	//				enrichment: enrichPerson
	// ----------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichPerson'],
			},
		},
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichPerson'],
			},
		},
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichPerson'],
			},
		},
	},
	{
		displayName: 'Linkedin Url',
		name: 'linkedinUrl',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichPerson'],
			},
		},
	},
	{
		displayName: 'Company Name',
		name: 'companyName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichPerson'],
			},
		},
	},
	{
		displayName: 'Company Domain',
		name: 'companyDomain',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['enrichPerson'],
			},
		},
	},
];
