import { INodeProperties } from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message',
			},
			{
				name: 'Send Private',
				value: 'sendPrivate',
				description: 'Send a private message',
			},
			{
				name: 'Send to Stream',
				value: 'sendStream',
				description: 'Send a message to stream',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a message',
			},
			{
				name: 'Upload a File',
				value: 'updateFile',
				description: 'Upload a file',
			},
		],
		default: 'sendPrivate',
		description: 'The operation to perform.',
	},
];

export const messageFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                message:sendPrivate                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'To',
		name: 'to',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'sendPrivate',
				],
			},
		},
		description: 'The destination stream, or a comma separated list containing the usernames (emails) of the recipients.',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'sendPrivate',
				],
			},
		},
		description: 'The content of the message.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                message:sendStream                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Stream',
		name: 'stream',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getStreams',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'sendStream',
				],
			},
		},
		description: 'The destination stream, or a comma separated list containing the usernames (emails) of the recipients.',
	},
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: [
				'stream',
			],
			loadOptionsMethod: 'getTopics',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'sendStream',
				],
			},
		},
		default: '',
		description: 'The topic of the message. Only required if type is stream, ignored otherwise.',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'sendStream',
				],
			},
		},
		description: 'The content of the message.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 message:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Unique identifier for the message.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The content of the message',
			},
			{
				displayName: 'Propagate Mode',
				name: 'propagateMode',
				type: 'options',
				options: [
					{
						name: 'Change One',
						value: 'changeOne',
					},
					{
						name: 'Change Later',
						value: 'changeLater',
					},
					{
						name: 'Change All',
						value: 'changeAll',
					},
				],
				default: 'changeOne',
				description: 'Which message(s) should be edited: just the one indicated in message_id, messages in the same topic that had been sent after this one, or all of them',
			},
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				description: 'The topic of the message. Only required for stream messages',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 message:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for the message.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 message:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Unique identifier for the message.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 message:updateFile                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Binary Property',
		name: 'dataBinaryProperty',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'updateFile',
				],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file.',
	},
];
