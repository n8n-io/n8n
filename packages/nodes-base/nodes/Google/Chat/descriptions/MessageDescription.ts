import {
	INodeProperties,
} from 'n8n-workflow';

export const messageOperations = [
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
				name: 'Create',
				value: 'create',
				description: 'Creates a message.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes a message.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a message.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Updates a message.',
			},
			{
				name: 'Webhook',
				value: 'webhook',
				description: 'Creates a message through webhook (no chat bot needed).',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];


export const messageFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 message:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Parent Name',
		name: 'parentName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Space resource name, in the form "spaces/*". Example: spaces/AAAAMpdlehY',
	},
	{
		displayName: 'Thread Key',
		name: 'threadKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Thread identifier which groups messages into a single thread. Has no effect if thread field, corresponding to an existing thread, is set in message. Example: spaces/AAAAMpdlehY/threads/MZ8fXhZXGkk',
	},
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: ' A unique request ID for this message. If a message has already been created in the space with this request ID, the subsequent request will return the existing message and no new message will be created.',
	},
	{
		displayName: 'Json Parameter Message',
		name: 'jsonParameterMessage',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'message',
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
					'message',
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
			// {	// todo: get cards from the ui
			// 	displayName: 'Cards',
			// 	name: 'cards',
			// 	placeholder: 'Add Cards',
			// 	type: 'fixedCollection',
			// 	default: '',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	description: 'Rich, formatted and interactive cards that can be used to display UI elements such as: formatted texts, buttons, clickable images.',
			// 	options: [
			// 		{
			// 			name: 'metadataValues',
			// 			displayName: 'Metadata',
			// 			values: [
			// 				{
			// 					displayName: 'Name',
			// 					name: 'name',
			// 					type: 'string',
			// 					default: '',
			// 					description: 'Name of the card.',
			// 				},
			// 				{
			// 					displayName: 'Header',
			// 					name: 'header',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Header of the card.',
			// 				},
			// 				{
			// 					displayName: 'Sections',
			// 					name: 'sections',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Sections of the card.',
			// 				},
			// 				{
			// 					displayName: 'Actions',
			// 					name: 'cardActions',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Actions of the card.',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
		],
	},
	{
		displayName: 'See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat guide</a> to creating messages',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'message',
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
		displayOptions: {
			show: {
				resource: [
					'message',
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

	/* -------------------------------------------------------------------------- */
	/*                                 messages:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
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
		default: '',
		description: 'Resource name of the message to be deleted, in the form "spaces/*/messages/*".',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 message:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
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
		default: '',
		description: 'Resource name of the message to be deleted, in the form "spaces/*/messages/*".',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 message:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
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
		default: '',
		description: 'Resource name of the message to be retrieved, in the form "spaces/*/messages/*".',
	},

	{
		displayName: 'Update Mask',
		name: 'updateMask',
		type: 'multiOptions',
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
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Cards',
				value: 'cards',
			},
		],
		default: [],
		description: 'The fields to be updated.',
	},
	{
		displayName: 'Json Parameter Update Options',
		name: 'jsonParameterUpdateOptions',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				updateMask: [
					'text',
					'cards',
				],
			},
		},
		default: false,
		description: 'Pass update options as JSON.',
	},
	{
		displayName: 'Text',
		name: 'textUi',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				updateMask: [
					'text',
				],
				jsonParameterUpdateOptions: [
					false,
				],
			},
		},
		default: '',
		description: 'The message text.',
	},
	//
	// {	// todo: get cards from the ui
	// 	displayName: 'Cards',
	// 	name: 'cardsUi',
	// 	placeholder: 'Add Cards',
	// 	type: 'fixedCollection',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'message',
	// 			],
	// 			operation: [
	// 				'update',
	// 			],
	// 			updateMask: [
	// 				'cards',
	// 			],
	// 			jsonParameterUpdateOptions: [
	// 				false,
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// 	typeOptions: {
	// 		multipleValues: true,
	// 	},
	// 	description: 'Rich, formatted and interactive cards that can be used to display UI elements such as: formatted texts, buttons, clickable images.',
	// 	options: [
	// 		{
	// 			name: 'metadataValues',
	// 			displayName: 'Metadata',
	// 			values: [
	// 				{
	// 					displayName: 'Name',
	// 					name: 'name',
	// 					type: 'string',
	// 					default: '',
	// 					description: 'Name of the card.',
	// 				},
	// 				{
	// 					displayName: 'Header',
	// 					name: 'header',
	// 					type: 'json',
	// 					default: '',
	// 					description: 'Header of the card.',
	// 				},
	// 				{
	// 					displayName: 'Sections',
	// 					name: 'sections',
	// 					type: 'json',
	// 					default: '',
	// 					description: 'Sections of the card.',
	// 				},
	// 				{
	// 					displayName: 'Actions',
	// 					name: 'cardActions',
	// 					type: 'json',
	// 					default: '',
	// 					description: 'Actions of the card.',
	// 				},
	// 			],
	// 		},
	// 	],
	// },
	{
		displayName: 'See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat guide</a> to creating messages',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				jsonParameterUpdateOptions: [
					true,
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Options (JSON)',
		name: 'updateOptionsJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				updateMask: [
					'text',
					'cards',
				],
				jsonParameterUpdateOptions: [
					true,
				],
			},
		},
		default: '',
		description: 'Update options input as JSON Object or JSON String.',
	},



	/* -------------------------------------------------------------------------- */
	/*                                 message:webhook                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'See <a href="https://developers.google.com/chat/how-tos/webhooks" target="_blank">Google Chat guide</a> to webhooks',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'webhook',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Incoming Webhook URL',
		name: 'webhookUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'webhook',
				],
			},
		},
		default: '',
		description: 'URL for the incoming webhook.',
	},

	{
		displayName: 'Thread Key (Full Path)',
		name: 'threadKey',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'webhook',
				],
			},
		},
		default: '',
		description: 'In the format of "spaces/*/threads/*". Thread identifier which groups messages into a single thread. Has no effect if thread field, corresponding to an existing thread, is set in message.',
	},
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'webhook',
				],
			},
		},
		default: '',
		description: ' A unique request ID for this message. If a message has already been created in the space with this request ID, the subsequent request will return the existing message and no new message will be created.',
	},
	{
		displayName: 'Json Parameter Message',
		name: 'jsonParameterMessage',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'webhook',
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
					'message',
				],
				operation: [
					'webhook',
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
					'message',
				],
				operation: [
					'webhook',
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
		displayOptions: {
			show: {

				resource: [
					'message',
				],
				operation: [
					'webhook',
				],
				jsonParameterMessage: [
					true,
				],
			},
		},
		default: '',
		description: 'Message input as JSON Object or JSON String.',
	},

] as INodeProperties[];
