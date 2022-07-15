import {
	INodeProperties,
} from 'n8n-workflow';

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a post',
				action: 'Create a post',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all posts',
				action: 'Get all posts',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a post',
				action: 'Delete a post',
			},
		],
		default: 'create',
	},
];

export const postFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                post:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Supply any URL and Orbit will do its best job to parse out a title, description, and image',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Occurred At',
				name: 'publishedAt',
				type: 'dateTime',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                post:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'getAll',
				],
			},
		},
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
					'post',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'post',
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
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Member ID',
				name: 'memberId',
				type: 'string',
				default: '',
				description: 'When set the post will be filtered by the member ID',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                post:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'post',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'post',
				],
			},
		},
	},
];
