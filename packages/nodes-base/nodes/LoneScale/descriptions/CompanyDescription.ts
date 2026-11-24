import type { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['company'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Look up a company by domain, Linkedin or name',
				action: 'Search a company',
			},
		],
		default: 'search',
		noDataExpression: true,
	},
];

export const companyFields: INodeProperties[] = [
	{
		displayName: 'Company Domain',
		name: 'searchDomain',
		type: 'string',
		placeholder: 'stripe.com',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['search'],
			},
		},
		default: '',
		description:
			'Company domain to look up. Provide at least one of domain, Linkedin ID, slug or name.',
	},
	{
		displayName: 'Linkedin ID',
		name: 'searchLinkedinId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'Numeric Linkedin company ID (the digits in the linkedin.com/company/ URL)',
	},
	{
		displayName: 'Slug',
		name: 'searchSlug',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['search'],
			},
		},
		default: '',
		description: 'Linkedin universal name / slug (the trailing segment of the company URL)',
	},
	{
		displayName: 'Company Name',
		name: 'searchName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['search'],
			},
		},
		default: '',
		description:
			'Company name. Best-effort match — prefer domain, Linkedin ID or slug for a deterministic result.',
	},
	{
		displayName: 'Enrich',
		name: 'searchEnrich',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['search'],
			},
		},
		default: false,
		description:
			'Whether to fall back to on-demand enrichment when no cached match is found, and attach a headcount breakdown when possible',
	},
];
