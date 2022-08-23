import { INodeProperties } from 'n8n-workflow';

export const issueCommentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add comment to issue',
				action: 'Add a comment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a comment',
				action: 'Get a comment',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all comments',
				action: 'Get all comments',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a comment',
				action: 'Remove a comment',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a comment',
				action: 'Update a comment',
			},
		],
		default: 'add',
	},
];

export const issueCommentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                issueComment:add                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['add'],
			},
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
		description: 'issueComment Key',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['add'],
				jsonParameters: [false],
			},
		},
		description: "Comment's text",
	},
	{
		displayName: 'Document Format (JSON)',
		name: 'commentJson',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['add'],
				jsonParameters: [true],
			},
		},
		description:
			'The Atlassian Document Format (ADF). Online builder can be found <a href="https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/">here</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'options',
				options: [
					{
						name: 'Rendered Body',
						value: 'renderedBody',
					},
				],
				default: '',
				description:
					'Use expand to include additional information about comments in the response. This parameter accepts Rendered Body, which returns the comment body rendered in HTML.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                issueComment:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID or key of the issue',
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['get'],
			},
		},
		description: 'The ID of the comment',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'options',
				options: [
					{
						name: 'Rendered Body',
						value: 'renderedBody',
					},
				],
				default: '',
				description:
					'Use expand to include additional information about comments in the response. This parameter accepts Rendered Body, which returns the comment body rendered in HTML.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  issueComment:getAll                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['getAll'],
			},
		},
		default: '',
		description: 'The ID or key of the issue',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['issueComment'],
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
				resource: ['issueComment'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'options',
				options: [
					{
						name: 'Rendered Body',
						value: 'renderedBody',
					},
				],
				default: '',
				description:
					'Use expand to include additional information about comments in the response. This parameter accepts Rendered Body, which returns the comment body rendered in HTML.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                issueComment:remove                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['remove'],
			},
		},
		default: '',
		description: 'The ID or key of the issue',
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['remove'],
			},
		},
		description: 'The ID of the comment',
	},

	/* -------------------------------------------------------------------------- */
	/*                                issueComment:update                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Issue Key',
		name: 'issueKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The Issue Comment key',
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['update'],
			},
		},
		description: 'The ID of the comment',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['update'],
				jsonParameters: [false],
			},
		},
		description: "Comment's text",
	},
	{
		displayName: 'Document Format (JSON)',
		name: 'commentJson',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['update'],
				jsonParameters: [true],
			},
		},
		description:
			'The Atlassian Document Format (ADF). Online builder can be found <a href="https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/">here</a>.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['issueComment'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Expand',
				name: 'expand',
				type: 'options',
				options: [
					{
						name: 'Rendered Body',
						value: 'renderedBody',
					},
				],
				default: '',
				description:
					'Use expand to include additional information about comments in the response. This parameter accepts Rendered Body, which returns the comment body rendered in HTML.',
			},
		],
	},
];
