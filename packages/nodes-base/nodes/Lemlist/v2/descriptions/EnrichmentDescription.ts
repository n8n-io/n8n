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
				operation: ['enrichLead'],
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
				operation: ['enrichLead'],
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
				operation: ['enrichLead'],
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
				operation: ['enrichLead'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['enrich'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Campaign Name or ID',
				name: 'campaignId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCampaigns',
				},
				description:
					'ID of the campaign to retrieve enrich for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'emailsOpened',
				description: 'Type of enrich to retrieve',
				options: [
					{
						name: 'Emails Bounced',
						value: 'emailsBounced',
					},
					{
						name: 'Emails Clicked',
						value: 'emailsClicked',
					},
					{
						name: 'Emails Opened',
						value: 'emailsOpened',
					},
					{
						name: 'Emails Replied',
						value: 'emailsReplied',
					},
					{
						name: 'Emails Send Failed',
						value: 'emailsSendFailed',
					},
					{
						name: 'Emails Sent',
						value: 'emailsSent',
					},
					{
						name: 'Emails Unsubscribed',
						value: 'emailsUnsubscribed',
					},
				],
			},
		],
	},
];
