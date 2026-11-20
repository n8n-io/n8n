import type { INodeProperties } from 'n8n-workflow';

export const filterOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['filter'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a filter',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a filter',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a filter',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many filters',
			},
			{
				name: 'Replace',
				value: 'replace',
				action: 'Replace a filter',
			},
		],
		default: 'getAll',
	},
];

export const filterFields: INodeProperties[] = [
	{
		displayName: 'Filter ID',
		name: 'filterId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['filter'],
				operation: ['get', 'delete', 'replace'],
			},
		},
		description: 'The ID of the filter',
	},
	{
		displayName:
			"Gmail can't edit filters, so Replace creates a new filter and then deletes this one. Use the new filter ID from the output in later steps.",
		name: 'replaceNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['filter'],
				operation: ['replace'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                         filter:create / replace                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Criteria',
		name: 'criteria',
		type: 'collection',
		placeholder: 'Add Criterion',
		default: {},
		required: true,
		displayOptions: {
			show: {
				resource: ['filter'],
				operation: ['create', 'replace'],
			},
		},
		options: [
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: 'sender@example.com',
				description: "The sender's display name or email address",
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: 'recipient@example.com',
				description:
					"The recipient's display name or email address (matches To, Cc, and Bcc headers)",
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Case-insensitive phrase found in the message subject',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'from:example.com has:attachment',
				description:
					'Only match messages matching this Gmail search query (same syntax as the Gmail search box)',
			},
			{
				displayName: 'Negated Query',
				name: 'negatedQuery',
				type: 'string',
				default: '',
				description: 'Only match messages that do not match this Gmail search query',
			},
			{
				displayName: 'Has Attachment',
				name: 'hasAttachment',
				type: 'boolean',
				default: false,
				description: 'Whether the message has any attachment',
			},
			{
				displayName: 'Exclude Chats',
				name: 'excludeChats',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude chat messages from matching',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'number',
				default: 0,
				description: 'Message size in bytes to compare against (used with Size Comparison)',
			},
			{
				displayName: 'Size Comparison',
				name: 'sizeComparison',
				type: 'options',
				options: [
					{
						name: 'Larger',
						value: 'larger',
					},
					{
						name: 'Smaller',
						value: 'smaller',
					},
				],
				default: 'larger',
				description: 'How the message size should relate to the Size field',
			},
		],
	},
	{
		displayName: 'Actions',
		name: 'action',
		type: 'collection',
		placeholder: 'Add Action',
		default: {},
		required: true,
		displayOptions: {
			show: {
				resource: ['filter'],
				operation: ['create', 'replace'],
			},
		},
		options: [
			{
				displayName: 'Add Label Names or IDs',
				name: 'addLabelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description:
					'Labels to add to matching messages. At most one user-defined label is allowed; system labels (INBOX, STARRED, IMPORTANT, etc.) are unlimited. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Remove Label Names or IDs',
				name: 'removeLabelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
				default: [],
				description:
					'Labels to remove from matching messages (e.g. INBOX to archive). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Forward To',
				name: 'forward',
				type: 'string',
				default: '',
				placeholder: 'forward@example.com',
				description:
					'Email address to forward matching messages to. Must be a verified forwarding address in Gmail settings.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 filter:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['filter'],
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
				operation: ['getAll'],
				resource: ['filter'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
