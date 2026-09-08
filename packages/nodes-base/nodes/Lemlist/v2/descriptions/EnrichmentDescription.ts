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
				name: 'Enrich lead',
				value: 'enrichLead',
				action: 'Enrich a lead using an email or LinkedIn URL',
			},
			{
				name: 'Enrich person',
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
		displayName: 'Find email',
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
		displayName: 'Verify email',
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
		displayName: 'LinkedIn enrichment',
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
		displayName: 'Find phone',
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
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
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
				displayName: 'First name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last name',
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
				displayName: 'Company name',
				name: 'companyName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company domain',
				name: 'companyDomain',
				type: 'string',
				default: '',
			},
		],
	},
];
