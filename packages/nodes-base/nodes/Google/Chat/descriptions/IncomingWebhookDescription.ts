import {
	INodeProperties,
} from 'n8n-workflow';

export const incomingWebhookOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
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
				description: 'Creates a message through incoming webhook (no chat bot needed).',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];


export const incomingWebhookFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 incomingWebhook:create                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'See <a href="https://developers.google.com/chat/how-tos/webhooks" target="_blank">Google Chat guide</a> to webhooks',
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
		description: 'URL for the incoming webhook.',
	},
	{
		displayName: 'Json Parameter Message',
		name: 'jsonParameterMessage',
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
		description: 'Pass message object as JSON.',
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
				jsonParameterMessage: [
					false,
				],
			},
		},
		default: {'text': ''},
		description: '',
		options: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The message text.',
			},
		],
	},
	{
		displayName: 'See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat guide</a> to creating messages',
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
				jsonParameterMessage: [
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
				jsonParameterMessage: [
					true,
				],
			},
		},
		default: '',
		description: 'Message input as JSON Object or JSON String.',
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'collection',
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
				description: 'Thread identifier which groups messages into a single thread. Has no effect if thread field, corresponding to an existing thread, is set in message. Example: spaces/AAAAMpdlehY/threads/MZ8fXhZXGkk',
			},
		],
	},

] as INodeProperties[];
