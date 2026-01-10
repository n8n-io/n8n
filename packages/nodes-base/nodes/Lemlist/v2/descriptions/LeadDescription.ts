import type { INodeProperties } from 'n8n-workflow';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a lead and add to a campaign',
				action: 'Create a lead',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a lead from a campaign',
				action: 'Delete a lead',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a lead by email',
				action: 'Get a lead',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many leads',
				action: 'Get many leads',
			},
			{
				name: 'Mark as Interested',
				value: 'markInterested',
				description: 'Mark a lead as interested',
				action: 'Mark lead as interested',
			},
			{
				name: 'Mark as Not Interested',
				value: 'markNotInterested',
				description: 'Mark a lead as not interested',
				action: 'Mark lead as not interested',
			},
			{
				name: 'Pause',
				value: 'pause',
				description: 'Pause a lead',
				action: 'Pause a lead',
			},
			{
				name: 'Resume',
				value: 'resume',
				description: 'Resume a paused lead',
				action: 'Resume a lead',
			},
			{
				name: 'Unsubscribe',
				value: 'unsubscribe',
				description: 'Unsubscribe a lead from a campaign',
				action: 'Unsubscribe a lead',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a lead in a campaign',
				action: 'Update a lead',
			},
		],
		displayOptions: {
			show: {
				resource: ['lead'],
			},
		},
	},
];

export const leadFields: INodeProperties[] = [
	// ----------------------------------
	//        lead: create
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to create the lead under. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email of the lead to create',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: 'Company name of the lead to create',
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				default: '',
				description: 'Company domain of the lead to create',
			},
			{
				displayName: 'Deduplicate',
				name: 'deduplicate',
				type: 'boolean',
				default: false,
				description:
					'Whether to do not insert if this email is already present in another campaign',
			},
			{
				displayName: 'Find Email',
				name: 'findEmail',
				type: 'boolean',
				default: false,
				description: 'Whether to find verified email',
			},
			{
				displayName: 'Find Phone',
				name: 'findPhone',
				type: 'boolean',
				default: false,
				description: 'Whether to find phone number',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the lead to create',
			},
			{
				displayName: 'Icebreaker',
				name: 'icebreaker',
				type: 'string',
				default: '',
				description: 'Icebreaker of the lead to create',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'Job title of the lead to create',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the lead to create',
			},
			{
				displayName: 'LinkedIn Enrichment',
				name: 'linkedinEnrichment',
				type: 'boolean',
				default: false,
				description: 'Whether to run the LinkedIn enrichment',
			},

			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				description: 'LinkedIn URL of the lead to create',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the lead to create',
			},
			{
				displayName: 'Picture URL',
				name: 'picture',
				type: 'string',
				default: '',
				description: 'Picture URL of the lead to create',
			},
			{
				displayName: 'Verify Email',
				name: 'verifyEmail',
				type: 'boolean',
				default: false,
				description: 'Whether to verify existing email (debounce)',
			},
		],
	},

	// ----------------------------------
	//        lead: delete
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to remove the lead from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email of the lead to delete',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------
	//           lead: get
	// ----------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email of the lead to retrieve',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//        lead: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['lead'],
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
				resource: ['lead'],
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
					'Filter leads by campaign. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description: 'Filter by email address',
			},
		],
	},

	// ----------------------------------
	//        lead: update
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign the lead belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the lead to update',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: 'Company name of the lead',
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				default: '',
				description: 'Company domain of the lead',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the lead',
			},
			{
				displayName: 'Icebreaker',
				name: 'icebreaker',
				type: 'string',
				default: '',
				description: 'Icebreaker text for the lead',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				default: '',
				description: 'Job title of the lead',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the lead',
			},
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				default: '',
				description: 'LinkedIn URL of the lead',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the lead',
			},
			{
				displayName: 'Picture URL',
				name: 'picture',
				type: 'string',
				default: '',
				description: 'Picture URL of the lead',
			},
		],
	},

	// ----------------------------------
	//        lead: pause
	// ----------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the lead to pause',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['pause'],
			},
		},
	},

	// ----------------------------------
	//        lead: resume
	// ----------------------------------
	{
		displayName: 'Lead ID',
		name: 'leadId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the lead to resume',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['resume'],
			},
		},
	},

	// ----------------------------------
	//        lead: markInterested
	// ----------------------------------
	{
		displayName: 'Lead ID or Email',
		name: 'leadIdOrEmail',
		type: 'string',
		required: true,
		default: '',
		description: 'ID or email of the lead to mark as interested',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['markInterested'],
			},
		},
	},
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		default: 'global',
		description: 'Whether to mark globally or for a specific campaign',
		options: [
			{
				name: 'Global',
				value: 'global',
				description: 'Mark as interested globally across all campaigns',
			},
			{
				name: 'Campaign',
				value: 'campaign',
				description: 'Mark as interested for a specific campaign',
			},
		],
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['markInterested'],
			},
		},
	},
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['markInterested'],
				scope: ['campaign'],
			},
		},
	},

	// ----------------------------------
	//        lead: markNotInterested
	// ----------------------------------
	{
		displayName: 'Lead ID or Email',
		name: 'leadIdOrEmail',
		type: 'string',
		required: true,
		default: '',
		description: 'ID or email of the lead to mark as not interested',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['markNotInterested'],
			},
		},
	},
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		default: 'global',
		description: 'Whether to mark globally or for a specific campaign',
		options: [
			{
				name: 'Global',
				value: 'global',
				description: 'Mark as not interested globally across all campaigns',
			},
			{
				name: 'Campaign',
				value: 'campaign',
				description: 'Mark as not interested for a specific campaign',
			},
		],
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['markNotInterested'],
			},
		},
	},
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['markNotInterested'],
				scope: ['campaign'],
			},
		},
	},

	// ----------------------------------
	//        lead: unsubscribe
	// ----------------------------------
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description:
			'ID of the campaign to unsubscribe the lead from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['unsubscribe'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email of the lead to unsubscribe',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['unsubscribe'],
			},
		},
	},
];
