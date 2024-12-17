import type { INodeProperties } from 'n8n-workflow';

export const programAffiliateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add affiliate to program',
				action: 'Add a program affiliate',
			},
			{
				name: 'Approve',
				value: 'approve',
				description: 'Approve an affiliate for a program',
				action: 'Approve a program affiliate',
			},
			{
				name: 'Disapprove',
				value: 'disapprove',
				description: 'Disapprove an affiliate',
				action: 'Disapprove a program affiliate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an affiliate in a program',
				action: 'Get a program affiliate',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many affiliates in program',
				action: 'Get many program affiliates',
			},
		],
		default: 'add',
	},
];

export const programAffiliateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 programAffiliate:add                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Program Name or ID',
		name: 'programId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getPrograms',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['add'],
				resource: ['programAffiliate'],
			},
		},
		description:
			'The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Affiliate ID',
		name: 'affiliateId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
				operation: ['add'],
			},
		},
		description: 'The ID of the affiliate',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Approved',
				name: 'approved',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'An optional approval status',
			},
			{
				displayName: 'Coupon',
				name: 'coupon',
				type: 'string',
				default: '',
				description: 'An optional coupon for this affiliate',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 programAffiliate:approve                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Program Name or ID',
		name: 'programId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPrograms',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['approve'],
				resource: ['programAffiliate'],
			},
		},
		description:
			'The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Affiliate ID',
		name: 'affiliateId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
				operation: ['approve'],
			},
		},
		description: 'The ID of the affiliate',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 programAffiliate:disapprove                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Program Name or ID',
		name: 'programId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPrograms',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['disapprove'],
				resource: ['programAffiliate'],
			},
		},
		description:
			'The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Affiliate ID',
		name: 'affiliateId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
				operation: ['disapprove'],
			},
		},
		description: 'The ID of the affiliate',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 affiliate:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Program Name or ID',
		name: 'programId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getPrograms',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['programAffiliate'],
			},
		},
		description:
			'The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Affiliate ID',
		name: 'affiliateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
				operation: ['get'],
			},
		},
		description: 'The ID of the affiliate',
	},

	/* -------------------------------------------------------------------------- */
	/*                          programAffiliate:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Program Name or ID',
		name: 'programId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPrograms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['programAffiliate'],
			},
		},
		description:
			'The ID of the Program to add the affiliate to. This ID can be found as part of the URL when viewing the program on the platform. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
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
				resource: ['programAffiliate'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['programAffiliate'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Affiliate Group ID',
				name: 'affiliate_group_id',
				type: 'string',
				default: '',
				description: 'Retrieves affiliates for a certain affiliate group',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'An email address',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Retrieves children for a certain parent affiliate',
			},
			{
				displayName: 'Source ID',
				name: 'source_id',
				type: 'string',
				default: '',
			},
		],
	},
];
