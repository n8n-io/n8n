import type { INodeProperties } from 'n8n-workflow';

export const reviewOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['review'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get review',
				description: 'Retrieve details of a specific review on Google My Business',
				routing: {
					request: {
						method: 'GET',
						url: '=/v4/{{account}}/{{location}}/{{review}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many reviews',
				description: 'Retrieve multiple reviews',
				routing: {
					request: {
						method: 'GET',
						url: '=/v4/{{account}}/{{location}}/reviews',
					},
				},
			},
			{
				name: 'Reply',
				value: 'reply',
				action: 'Reply to review',
				description: 'Reply to a review',
				routing: {
					request: {
						method: 'PUT',
						url: '=/v4/{{account}}/{{location}}/{{review}}/reply',
					},
				},
			},
		],
		default: 'get',
	},
];

export const reviewFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 review:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		description: 'The Google My Business account name',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Review',
		name: 'location',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['review'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getReviews',
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 review:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		description: 'The Google My Business account name',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		required: true,
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['review'],
			},
		},
	},

	// ToDo: Simplify (if it makes sense)

	/* -------------------------------------------------------------------------- */
	/*                                 review:reply                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Account',
		name: 'account',
		required: true,
		type: 'options',
		default: '',
		description: 'The Google My Business account name',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Location',
		name: 'location',
		required: true,
		type: 'string',
		default: '',
		description: 'The specific location or business associated with the account',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
	},
	{
		displayName: 'Review Name',
		name: 'reviewName',
		type: 'string',
		default: '',
		description: 'Select the post by name or URL to retrieve its details',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getReviews',
		},
	},
	{
		displayName: 'Reply',
		name: 'comment',
		type: 'string',
		default: '',
		description: 'The body of the reply (up to 4096 characters)',
		displayOptions: {
			show: {
				operation: ['reply'],
				resource: ['review'],
			},
		},
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
]
