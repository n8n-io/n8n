import {
	INodeProperties,
} from 'n8n-workflow';

export const issueOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get issue by ID',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all issues',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an issue',
			},
		],
		default: 'get',
		description: 'The operation to perform',
	},
];

export const issueFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                issue:get/delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		default: '',
		placeholder: '1234',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'get',
					'delete',
				],
			},
		},
		required: true,
		description: 'ID of issue to get.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                issue:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getOrganizations',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the issues belong to.',
	},
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
			loadOptionsDependsOn: [
				'organizationSlug',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getAll',
				],
			},
		},
		required: true,
		description: 'The slug of the project the issues belong to.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'issue',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'issue',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'An optional Sentry structured search query. If not provided, an implied "is:unresolved" is assumed. Info <a href="https://docs.sentry.io/product/sentry-basics/search/">here</a>.',
			},
			{
				displayName: 'Stats Period',
				name: 'statsPeriod',
				type: 'options',
				default: '',
				description: 'Time period of stats.',
				options: [
					{
						name: '14 Days',
						value: '14d',
					},
					{
						name: '24 Hours',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Short ID lookup',
				name: 'shortIdLookUp',
				type: 'boolean',
				default: true,
				description: 'If this is set to true then short IDs are looked up by this function as well. This can cause the return value of the function to return an event issue of a different project which is why this is an opt-in.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                issue:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue ID',
		name: 'issueId',
		type: 'string',
		default: '',
		placeholder: '1234',
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
		description: 'ID of issue to get.',
	},
	{
		displayName: 'Update Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned to',
				name: 'assignedTo',
				type: 'string',
				default: '',
				description: 'The actor ID (or username) of the user or team that should be assigned to this issue.',
			},
			{
				displayName: 'Has Seen',
				name: 'hasSeen',
				type: 'boolean',
				default: true,
				description: 'In case this API call is invoked with a user context this allows changing of the flag that indicates if the user has seen the event.',
			},
			{
				displayName: 'Is Bookmarked',
				name: 'isBookmarked',
				type: 'boolean',
				default: true,
				description: 'In case this API call is invoked with a user context this allows changing of the bookmark flag.',
			},
			{
				displayName: 'Is Public',
				name: 'isPublic',
				type: 'boolean',
				default: true,
				description: 'Sets the issue to public or private.',
			},
			{
				displayName: 'Is Subscribed',
				name: 'isSubscribed',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				description: 'The new status for the issue.',
				options: [
					{
						name: 'Ignored',
						value: 'ignored',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
					{
						name: 'Resolved Next Release',
						value: 'resolvedInNextRelease',
					},
					{
						name: 'Unresolved',
						value: 'unresolved',
					},
				],
			},
		],
	},
];
