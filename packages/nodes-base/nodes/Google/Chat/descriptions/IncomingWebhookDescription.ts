import {
	INodeProperties,
} from 'n8n-workflow';

export const incomingWebhookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Creates a message through incoming webhook (no chat bot needed)',
			},
		],
		default: 'create',
	},
];


export const incomingWebhookFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 incomingWebhook:create                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'See <a href="https://developers.google.com/chat/how-tos/webhooks" target="_blank">Google Chat Guide</a> To Webhooks',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Incoming Webhook URL',
		name: 'incomingWebhookUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'URL for the incoming webhook',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
				operation: [
					'create',
				],
			},
		},
		default: false,
		description: 'Whether to pass the message object as JSON',
	},
	{
		displayName: 'Message',
		name: 'messageUi',
		type: 'collection',
		required: true,
		placeholder: 'Add Options',
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: {'text': ''},
		description: 'The message object',
		options: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The message text',
			},
		],
	},
	{
		displayName: 'See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat Guide</a> To Creating Messages',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Message (JSON)',
		name: 'messageJson',
		type: 'json',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Message input as JSON Object or JSON String',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'incomingWebhook',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Thread Key',
				name: 'threadKey',
				type: 'string',
				default: '',
				description: 'Thread identifier which groups messages into a single thread. Has no effect if thread field, corresponding to an existing thread, is set in message. Example: spaces/AAAAMpdlehY/threads/MZ8fXhZXGkk.',
			},
		],
	},
];
