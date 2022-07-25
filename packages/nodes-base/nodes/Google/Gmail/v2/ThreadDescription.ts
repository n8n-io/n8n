import {
	INodeProperties,
} from 'n8n-workflow';

export const threadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a thread',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a thread',
				action: 'Get a thread',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all threads',
				action: 'Get all threads',
			},
			{
				name: 'Trash',
				value: 'trash',
				action: 'Trash a thread',
			},
			{
				name: 'Untrash',
				value: 'untrash',
				action: 'Untrash a thread',
			},
		],
		default: 'get',
	},
];

export const threadFields: INodeProperties[] = [
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'get',
					'delete',
					'trash',
					'untrash',
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'get',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Full',
						value: 'full',
						description: 'Returns the full email message data with body content parsed in the payload field; the raw field is not used',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Returns only email message IDs, labels, and email headers',
					},
					{
						name: 'Minimal',
						value: 'minimal',
						description: 'Returns only email message IDs and labels; does not return the email headers, body, or payload',
					},
				],
				default: 'minimal',
			},
			{
				displayName: 'Return Only Messages',
				name: 'returnOnlyMessages',
				type: 'boolean',
				default: true,
				description: 'Whether to return only thread messages',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 thread:getAll                              */
	/* -------------------------------------------------------------------------- */
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
					'thread',
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
					'thread',
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
		default: 50,
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
				operation: [
					'getAll',
				],
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				displayName: 'Include Spam and Trash',
				name: 'includeSpamTrash',
				type: 'boolean',
				default: false,
				description: 'Whether to include threads from SPAM and TRASH in the results',
			},
			{
				displayName: 'Label ID Names or IDs',
				name: 'labelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description: 'Only return threads with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Matches Search Query',
				name: 'q',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Only return messages matching the specified query. Supports the same query format as the Gmail search box. For example, "from:name@email.com is:unread". See more <a href="https://support.google.com/mail/answer/7190?hl=en">here</a>',
			},
		],
	},
];
