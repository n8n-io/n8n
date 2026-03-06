import { INodeProperties } from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Broadcast',
				value: 'broadcast',
				description: 'Send a message to all followers',
				action: 'Broadcast a message',
			},
			{
				name: 'Multicast',
				value: 'multicast',
				description: 'Send a message to multiple users (up to 500)',
				action: 'Multicast a message',
			},
			{
				name: 'Push',
				value: 'push',
				description: 'Send a message to a specific user',
				action: 'Push a message',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Reply to a user using a replyToken from a webhook event',
				action: 'Reply to a message',
			},
		],
		default: 'reply',
	},
];

export const messageFields: INodeProperties[] = [
	{
		displayName: 'Reply Token',
		name: 'replyToken',
		type: 'string',
		default: '',
		description: 'The replyToken from the webhook event',
		displayOptions: { show: { resource: ['message'], operation: ['reply'] } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'The userId of the message recipient',
		displayOptions: { show: { resource: ['message'], operation: ['push'] } },
	},
	{
		displayName: 'User IDs',
		name: 'userIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated list of userIds to send to (up to 500)',
		displayOptions: { show: { resource: ['message'], operation: ['multicast'] } },
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'json',
		required: true,
		default: '[{"type": "text", "text": ""}]',
		description: 'Array of LINE message objects (up to 5). Supported types: text, sticker, image, flex, etc.',
		typeOptions: { rows: 6 },
		displayOptions: { show: { resource: ['message'] } },
	},
];
