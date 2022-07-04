import { INodeProperties } from 'n8n-workflow';

export const conversationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new conversation',
				action: 'Create a conversation',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a conversation',
				action: 'Delete a conversation',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a conversation',
				action: 'Get a conversation',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all conversations',
				action: 'Get all conversations',
			},
		],
		default: 'create',
	},
];

export const conversationFields: INodeProperties[] = [
/* -------------------------------------------------------------------------- */
/*                                conversation:create                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Mailbox Name or ID',
		name: 'mailboxId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getMailboxes',
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'conversation',
				],
			},
		},
		default: '',
		description: 'ID of a mailbox where the conversation is being created. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Active',
				value: 'active',
			},
			{
				name: 'Closed',
				value: 'closed',
			},
			{
				name: 'Pending',
				value: 'pending',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'conversation',
				],
			},
		},
		default: '',
		description: 'Conversation status',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'conversation',
				],
			},
		},
		default: '',
		description: 'Conversation’s subject',
	},
	{
		displayName: 'Type',
		name: 'type',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Chat',
				value: 'chat',
			},
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Phone',
				value: 'phone',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'conversation',
				],
			},
		},
		default: '',
		description: 'Conversation type',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'conversation',
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: 'By default the response only contain the ID to resource. If this option gets activated, it will resolve the data automatically.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'conversation',
				],
			},
		},
		options: [
			{
				displayName: 'Assign To',
				name: 'assignTo',
				type: 'number',
				default: 0,
				description: 'The Help Scout user assigned to the conversation',
			},
			{
				displayName: 'Auto Reply',
				name: 'autoReply',
				type: 'boolean',
				default: false,
				description: 'Whether set to true, an auto reply will be sent as long as there is at least one customer thread in the conversation',
			},
			{
				displayName: 'Closed At',
				name: 'closedAt',
				type: 'dateTime',
				default: '',
				description: 'When the conversation was closed, only applicable for imported conversations',
			},
			{
				displayName: 'Created At',
				name: 'createdAt',
				type: 'dateTime',
				default: '',
				description: 'When this conversation was created - ISO 8601 date time',
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Imported',
				name: 'imported',
				type: 'boolean',
				default: false,
				description: 'Whether set to true, no outgoing emails or notifications will be generated',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'List of tags to be added to the conversation. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
			{
				displayName: 'User ID',
				name: 'user',
				type: 'number',
				default: 0,
				description: 'ID of the user who is adding the conversation and threads',
			},
		],
	},
	{
		displayName: 'Threads',
		name: 'threadsUi',
		placeholder: 'Add Thread',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'conversation',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Thread',
				name: 'threadsValues',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Chat',
								value: 'chat',
							},
							{
								name: 'Customer',
								value: 'customer',
							},
							{
								name: 'Note',
								value: 'note',
							},
							{
								name: 'Phone',
								value: 'phone',
							},
							{
								name: 'Reply',
								value: 'reply',
							},
						],
						default: '',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'The message text',
					},
					{
						displayName: 'Bcc',
						name: 'bcc',
						displayOptions: {
							show: {
								type: [
									'customer',
								],
							},
						},
						type: 'string',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Email',
						},
						default: [],
						description: 'Email addresses',
					},
					{
						displayName: 'Cc',
						name: 'cc',
						displayOptions: {
							show: {
								type: [
									'customer',
								],
							},
						},
						type: 'string',
						typeOptions: {
							multipleValues: true,
							multipleValueButtonText: 'Add Email',
						},
						default: [],
						description: 'Email addresses',
					},
					{
						displayName: 'Draft',
						name: 'draft',
						displayOptions: {
							show: {
								type: [
									'reply',
								],
							},
						},
						type: 'boolean',
						default: false,
						description: 'Whether true, a draft reply is created',
					},
				],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                conversation:get                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'get',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                conversation:delete                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'delete',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                conversation:getAll                         */
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
					'conversation',
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
					'conversation',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Assign To',
				name: 'assignTo',
				type: 'number',
				default: 0,
				description: 'Filters conversations by assignee ID',
			},
			{
				displayName: 'Embed',
				name: 'embed',
				type: 'options',
				options: [
					{
						name: 'Threads',
						value: 'threads',
					},
				],
				default: '',
				description: 'Allows embedding/loading of sub-entities',
			},
			{
				displayName: 'Folder ID',
				name: 'folder',
				type: 'string',
				default: '',
				description: 'Filters conversations from a specific folder ID',
			},
			{
				displayName: 'Mailbox ID',
				name: 'mailbox',
				type: 'string',
				default: '',
				description: 'Filters conversations from a specific mailbox',
			},
			{
				displayName: 'Modified Since',
				name: 'modifiedSince',
				type: 'dateTime',
				default: '',
				description: 'Returns only conversations that were modified after this date',
			},
			{
				displayName: 'Number',
				name: 'number',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description: 'Looks up conversation by conversation number',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Advanced search <a href="https://developer.helpscout.com/mailbox-api/endpoints/conversations/list/#query">Examples</a>',
			},
			{
				displayName: 'Sort Field',
				name: 'sortField',
				type: 'options',
				options: [
					{
						name: 'Created At',
						value: 'createdAt',
					},
					{
						name: 'Customer Email',
						value: 'customerEmail',
					},
					{
						name: 'Customer Name',
						value: 'customerName',
					},
					{
						name: 'Mailbox ID',
						value: 'mailboxid',
					},
					{
						name: 'Modified At',
						value: 'modifiedAt',
					},
					{
						name: 'Number',
						value: 'number',
					},
					{
						name: 'Score',
						value: 'score',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Subject',
						value: 'subject',
					},
				],
				default: '',
				description: 'Sorts the result by specified field',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Spam',
						value: 'spam',
					},
				],
				default: 'active',
				description: 'Filter conversation by status',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'Filter conversation by tags. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
			},
		],
	},
];
