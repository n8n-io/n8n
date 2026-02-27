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
				description: '全フォロワーに一斉送信',
				action: 'Broadcast a message',
			},
			{
				name: 'Multicast',
				value: 'multicast',
				description: '複数ユーザーに送信（最大500人）',
				action: 'Multicast a message',
			},
			{
				name: 'Push',
				value: 'push',
				description: '特定ユーザーに送信',
				action: 'Push a message',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'replyToken を使って返信',
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
		description: 'Webhook イベントの replyToken',
		displayOptions: { show: { resource: ['message'], operation: ['reply'] } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'メッセージ送信先の userId',
		displayOptions: { show: { resource: ['message'], operation: ['push'] } },
	},
	{
		displayName: 'User IDs',
		name: 'userIds',
		type: 'string',
		required: true,
		default: '',
		description: 'カンマ区切りで複数の userId を指定（最大500人）',
		displayOptions: { show: { resource: ['message'], operation: ['multicast'] } },
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'json',
		required: true,
		default: '[{"type": "text", "text": ""}]',
		description:
			'LINE メッセージオブジェクトの配列（最大5件）。type: text / sticker / image / flex など',
		typeOptions: { rows: 6 },
		displayOptions: { show: { resource: ['message'] } },
	},
];
