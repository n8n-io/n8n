import type { INodeProperties } from 'n8n-workflow';

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archives a conversation',
				action: 'Archive a channel',
			},
			{
				name: 'Close',
				value: 'close',
				description: 'Closes a direct message or multi-person direct message',
				action: 'Close a channel',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Initiates a public or private channel-based conversation',
				action: 'Create a channel',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get information about a channel',
				action: 'Get a channel',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many channels in a Slack team',
				action: 'Get many channels',
			},
			{
				name: 'History',
				value: 'history',
				description: "Get a conversation's history of messages and events",
				action: 'Get the history of a channel',
			},
			{
				name: 'Invite',
				value: 'invite',
				description: 'Invite a user to a channel',
				action: 'Invite a user to a channel',
			},
			{
				name: 'Join',
				value: 'join',
				description: 'Joins an existing conversation',
				action: 'Join a channel',
			},
			{
				name: 'Kick',
				value: 'kick',
				description: 'Removes a user from a channel',
				action: 'Kick a user from a channel',
			},
			{
				name: 'Leave',
				value: 'leave',
				description: 'Leaves a conversation',
				action: 'Leave a channel',
			},
			{
				name: 'Member',
				value: 'member',
				description: 'List members of a conversation',
				action: 'Get members of a channel',
			},
			{
				name: 'Open',
				value: 'open',
				description: 'Opens or resumes a direct message or multi-person direct message',
				action: 'Open a channel',
			},
			{
				name: 'Rename',
				value: 'rename',
				description: 'Renames a conversation',
				action: 'Rename a channel',
			},
			{
				name: 'Replies',
				value: 'replies',
				description: 'Get a thread of messages posted to a channel',
				action: 'Get a thread of messages posted to a channel',
			},
			{
				name: 'Set Purpose',
				value: 'setPurpose',
				description: 'Sets the purpose for a conversation',
				action: 'Set the purpose of a channel',
			},
			{
				name: 'Set Topic',
				value: 'setTopic',
				description: 'Sets the topic for a conversation',
				action: 'Set the topic of a channel',
			},
			{
				name: 'Unarchive',
				value: 'unarchive',
				description: 'Unarchives a conversation',
				action: 'Unarchive a channel',
			},
		],
		default: 'create',
	},
];

export const channelFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                channel:archive                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				operation: ['archive'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description:
			'The name of the channel to archive. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:close                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				operation: ['close'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description:
			'The name of the channel to close. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel',
		name: 'channelId',
		type: 'string',
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['channel'],
			},
		},
		required: true,
		description: 'The name of the channel to create',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Is Private',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'Whether to create a private channel instead of a public one',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:invite                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['invite'],
				resource: ['channel'],
			},
		},
		required: true,
		description:
			'The ID of the channel to invite user to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'User Names or IDs',
		name: 'userIds',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		default: [],
		displayOptions: {
			show: {
				operation: ['invite'],
				resource: ['channel'],
			},
		},
		required: true,
		description:
			'The ID of the user to invite into channel. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  channel:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel',
		name: 'channelId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['channel'],
			},
		},
		required: true,
		description: 'Channel ID to learn more about',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include Num of Members',
				name: 'includeNumMembers',
				type: 'boolean',
				default: false,
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  channel:kick                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: ['kick'],
				resource: ['channel'],
			},
		},
		required: true,
		description:
			'The name of the channel to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				operation: ['kick'],
				resource: ['channel'],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  channel:join                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: ['join'],
				resource: ['channel'],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['channel'],
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
				resource: ['channel'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Exclude Archived',
				name: 'excludeArchived',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude archived channels from the list',
			},
			{
				displayName: 'Types',
				name: 'types',
				type: 'multiOptions',
				options: [
					{
						name: 'Public Channel',
						value: 'public_channel',
					},
					{
						name: 'Private Channel',
						value: 'private_channel',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'mpim',
						value: 'mpim',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'im',
						value: 'im',
					},
				],
				default: ['public_channel'],
				description: 'Mix and match channel types',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:history                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: ['history'],
				resource: ['channel'],
			},
		},
		required: true,
		description:
			'The name of the channel to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['history'],
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
				resource: ['channel'],
				operation: ['history'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['history'],
			},
		},
		options: [
			{
				displayName: 'Inclusive',
				name: 'inclusive',
				type: 'boolean',
				default: false,
				description:
					'Whether to include messages with latest or oldest timestamp in results only when either timestamp is specified',
			},
			{
				displayName: 'Latest',
				name: 'latest',
				type: 'dateTime',
				default: '',
				description: 'End of time range of messages to include in results',
			},
			{
				displayName: 'Oldest',
				name: 'oldest',
				type: 'dateTime',
				default: '',
				description: 'Start of time range of messages to include in results',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:leave                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				operation: ['leave'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description:
			'The name of the channel to leave. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  channel:member                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		displayOptions: {
			show: {
				operation: ['member'],
				resource: ['channel'],
			},
		},
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['member'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
		default: 100,
		placeholder: 'Limit',
		displayOptions: {
			show: {
				operation: ['member'],
				resource: ['channel'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['member'],
			},
		},
		description:
			'Whether to resolve the data automatically. By default the response only contain the ID to resource.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:open                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['open'],
			},
		},
		options: [
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				description:
					"Resume a conversation by supplying an im or mpim's ID. Or provide the users field instead.",
			},
			{
				displayName: 'Return IM',
				name: 'returnIm',
				type: 'boolean',
				default: false,
				description: 'Whether you want the full IM channel definition in the response',
			},
			{
				displayName: 'User Names or IDs',
				name: 'users',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: [],
				description:
					'If only one user is included, this creates a 1:1 DM. The ordering of the users is preserved whenever a multi-person direct message is returned. Supply a channel when not supplying users. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:rename                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				operation: ['rename'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description:
			'The name of the channel to rename. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['rename'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description: 'New name for conversation',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 channel:replies                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		placeholder: 'Channel name',
		displayOptions: {
			show: {
				operation: ['replies'],
				resource: ['channel'],
			},
		},
		required: true,
		description:
			'The name of the channel to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'TS',
		name: 'ts',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['replies'],
				resource: ['channel'],
			},
		},
		required: true,
		description: "Unique identifier of a thread's parent message",
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['replies'],
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
				resource: ['channel'],
				operation: ['replies'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['replies'],
			},
		},
		options: [
			{
				displayName: 'Inclusive',
				name: 'inclusive',
				type: 'boolean',
				default: false,
				description:
					'Whether to include messages with latest or oldest timestamp in results only when either timestamp is specified',
			},
			{
				displayName: 'Latest',
				name: 'latest',
				type: 'string',
				default: '',
				description: 'End of time range of messages to include in results',
			},
			{
				displayName: 'Oldest',
				name: 'oldest',
				type: 'string',
				default: '',
				description: 'Start of time range of messages to include in results',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:setPurpose                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				operation: ['setPurpose'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description:
			'Conversation to set the purpose of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Purpose',
		name: 'purpose',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['setPurpose'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description: 'A new, specialer purpose',
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:setTopic                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				operation: ['setTopic'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description:
			'Conversation to set the topic of. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['setTopic'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description: 'The new topic string. Does not support formatting or linkification.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                channel:unarchive                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				operation: ['unarchive'],
				resource: ['channel'],
			},
		},
		default: '',
		required: true,
		description:
			'The ID of the channel to unarchive. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
