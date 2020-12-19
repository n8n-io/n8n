import {
	INodeProperties
} from 'n8n-workflow';

export const messageConversationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'messageConversation',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message in a conversation',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageConversationFields = [

	/* -------------------------------------------------------------------------- */
	/*                                messageConversation:create                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace ID',
		name: 'workspaceId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getWorkspaces',
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'messageConversation',
				],
			},
		},
		required: true,
		description: 'The ID of the workspace.',
	},
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getConversations',
			loadOptionsDependsOn: [
				'workspaceId',
			],
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'messageConversation',
				],
			},
		},
		required: true,
		description: 'The ID of the conversation.',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'messageConversation',
				],
			},
		},
		description: `The content of the new message. Mentions can be used as [Name](twist-mention://user_id) for users or [Group name](twist-group-mention://group_id) for groups.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'messageConversation',
				],
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
								description: 'The text for the action button.',
								default: '',
							},
							{
								displayName: 'Message',
								name: 'message',
								type: 'string',
								displayOptions: {
									show: {
										action: [
											'send_reply',
											'prefill_message',
										],
									},
								},
								description: 'The text for the action button.',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'The type of the button, for now just action is available.',
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
										action: [
											'open_url',
										],
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
				description: 'Name of the property that holds the binary data. Multiple can be defined separated by comma.',
			},
			{
				displayName: 'Direct Mentions',
				name: 'direct_mentions',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description: `The users that are directly mentioned`,
			},
			// {
			// 	displayName: 'Direct Group Mentions ',
			// 	name: 'direct_group_mentions',
			// 	type: 'multiOptions',
			// 	typeOptions: {
			// 		loadOptionsMethod: 'getGroups',
			// 	},
			// 	default: [],
			// 	description: `The groups that are directly mentioned`,
			// },
		],
	},
] as INodeProperties[];
