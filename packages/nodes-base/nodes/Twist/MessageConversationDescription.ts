import { INodeProperties } from 'n8n-workflow';

export const messageConversationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['messageConversation'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message in a conversation',
				action: 'Create a message',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message in a conversation',
				action: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message in a conversation',
				action: 'Get a message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all messages in a conversation',
				action: 'Get many messages',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a message in a conversation',
				action: 'Update a message',
			},
		],
		default: 'create',
	},
];

export const messageConversationFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                messageConversation:create                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['messageConversation'],
			},
		},
		required: true,
		description:
			'The ID of the workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Conversation Name or ID',
		name: 'conversationId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getConversations',
			loadOptionsDependsOn: ['workspaceId'],
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['messageConversation'],
			},
		},
		required: true,
		description:
			'The ID of the conversation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['messageConversation'],
			},
		},
		description:
			'The content of the new message. Mentions can be used as <code>[Name](twist-mention://user_id)</code> for users or <code>[Group name](twist-group-mention://group_id)</code> for groups.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['messageConversation'],
			},
		},
		default: {},
		description: 'Other options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Actions',
				name: 'actionsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Action',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Action',
						name: 'actionValues',
						values: [
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								description: 'The action of the button',
								options: [
									{
										name: 'Open URL',
										value: 'open_url',
									},
									{
										name: 'Prefill Message',
										value: 'prefill_message',
									},
									{
										name: 'Send Reply',
										value: 'send_reply',
									},
								],
								default: '',
							},
							{
								displayName: 'Button Text',
								name: 'button_text',
								type: 'string',
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								displayOptions: {
									show: {
										action: ['send_reply', 'prefill_message'],
									},
								},
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description:
									'The type of the button. (Currently only <code>action</code> is available).',
								options: [
									{
										name: 'Action',
										value: 'action',
									},
								],
								default: '',
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								displayOptions: {
									show: {
										action: ['open_url'],
									},
								},
								description: 'URL to redirect',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Attachments',
				name: 'binaryProperties',
				type: 'string',
				default: 'data',
				description:
					'Name of the property that holds the binary data. Multiple can be defined separated by comma.',
			},
			{
				displayName: 'Direct Mention Names or IDs',
				name: 'direct_mentions',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description:
					'The users that are directly mentioned. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			// {
			// 	displayName: 'Direct Group Mentions ',
			// 	name: 'direct_group_mentions',
			// 	type: 'multiOptions',
			// 	typeOptions: {
			// 		loadOptionsMethod: 'getGroups',
			// 	},
			// 	default: [],
			// 	description: 'The groups that are directly mentioned.',
			// },
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                messageConversation:getAll                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['messageConversation'],
			},
		},
		required: true,
		description:
			'The ID of the workspace. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Conversation Name or ID',
		name: 'conversationId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getConversations',
			loadOptionsDependsOn: ['workspaceId'],
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['messageConversation'],
			},
		},
		required: true,
		description:
			'The ID of the conversation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['messageConversation'],
			},
		},
		default: {},
		description: 'Other options to set',
		options: [
			{
				displayName: 'Ending Object Index',
				name: 'to_obj_index',
				type: 'number',
				default: 50,
				description: 'Limit messages ending at the specified object index',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Order By',
				name: 'order_by',
				type: 'options',
				default: 'ASC',
				description: 'The order of the conversations returned - one of DESC or ASC',
				options: [
					{
						name: 'ASC',
						value: 'ASC',
					},
					{
						name: 'DESC',
						value: 'DESC',
					},
				],
			},
			{
				displayName: 'Starting Object Index',
				name: 'from_obj_index',
				type: 'number',
				default: 0,
				description: 'Limit messages starting at the specified object index',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                messageConversation:get/delete/update       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['delete', 'get'],
				resource: ['messageConversation'],
			},
		},
		required: true,
		description: 'The ID of the conversation message',
	},

	/* -------------------------------------------------------------------------- */
	/*                                messageConversation:update                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation Message ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['messageConversation'],
			},
		},
		required: true,
		description: 'The ID of the conversation message',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['messageConversation'],
			},
		},
		default: {},
		description: 'Other options to set',
		options: [
			{
				displayName: 'Actions',
				name: 'actionsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Action',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Action',
						name: 'actionValues',
						values: [
							{
								displayName: 'Action',
								name: 'action',
								type: 'options',
								description: 'The action of the button',
								options: [
									{
										name: 'Open URL',
										value: 'open_url',
									},
									{
										name: 'Prefill Message',
										value: 'prefill_message',
									},
									{
										name: 'Send Reply',
										value: 'send_reply',
									},
								],
								default: '',
							},
							{
								displayName: 'Button Text',
								name: 'button_text',
								type: 'string',
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								displayOptions: {
									show: {
										action: ['send_reply', 'prefill_message'],
									},
								},
								description: 'The text for the action button',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description:
									'The type of the button. (Currently only <code>action</code> is available).',
								options: [
									{
										name: 'Action',
										value: 'action',
									},
								],
								default: '',
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								displayOptions: {
									show: {
										action: ['open_url'],
									},
								},
								description: 'URL to redirect',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Attachments',
				name: 'binaryProperties',
				type: 'string',
				default: 'data',
				description:
					'Name of the property that holds the binary data. Multiple can be defined separated by comma.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description:
					'The content of the new message. Mentions can be used as <code>[Name](twist-mention://user_id)</code> for users or <code>[Group name](twist-group-mention://group_id)</code> for groups.',
			},
			{
				displayName: 'Direct Mention Names or IDs',
				name: 'direct_mentions',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description:
					'The users that are directly mentioned. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
];
