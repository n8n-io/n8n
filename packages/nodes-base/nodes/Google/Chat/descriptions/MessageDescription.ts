import {
	INodeProperties,
} from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
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
				description: 'Create a message',
			},
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
				name: 'Update',
				value: 'update',
				description: 'Update a message',
			},
		],
		default: 'create',
	},
];

export const messageFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 message:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Space Name/ID',
		name: 'spaceId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
		},
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
		description: 'Space resource name, in the form "spaces/*". Example: spaces/AAAAMpdlehY.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
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
		description: 'Whether to pass the message object as JSON',
	},
	{
		displayName: 'Message',
		name: 'messageUi',
		type: 'collection',
		required: true,
		placeholder: 'Add Message',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
			},
			// {	// TODO: get cards from the UI (check the Slack node, specifically the blocks parameter under message: post)
			// 	displayName: 'Cards',
			// 	name: 'cards',
			// 	placeholder: 'Add Cards',
			// 	type: 'fixedCollection',
			// 	default: '',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	description: 'Rich, formatted and interactive cards that can be used to display UI elements such as: formatted texts, buttons, clickable images',
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
			// 					description: 'Name of the card',
			// 				},
			// 				{
			// 					displayName: 'Header',
			// 					name: 'header',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Header of the card',
			// 				},
			// 				{
			// 					displayName: 'Sections',
			// 					name: 'sections',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Sections of the card',
			// 				},
			// 				{
			// 					displayName: 'Actions',
			// 					name: 'cardActions',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Actions of the card',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
		],
	},
	{
		displayName: 'See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat Guide</a> To Creating Messages',
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
					'message',
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
					'message',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			// {
			// 	displayName: 'Thread Key',
			// 	name: 'threadKey',
			// 	type: 'string',
			// 	default: '',
			// 	description: 'Thread identifier which groups messages into a single thread. Has no effect if thread field, corresponding to an existing thread, is set in message. Example: spaces/AAAAMpdlehY/threads/MZ8fXhZXGkk.',
			// },
			{
				displayName: 'Request ID',
				name: 'requestId',
				type: 'string',
				default: '',
				description: 'A unique request ID for this message. If a message has already been created in the space with this request ID, the subsequent request will return the existing message and no new message will be created.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 messages:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
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
		description: 'Resource name of the message to be deleted, in the form "spaces//messages/"',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 message:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
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
		description: 'Resource name of the message to be retrieved, in the form "spaces//messages/"',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 message:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
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
		description: 'Resource name of the message to be updated, in the form "spaces//messages/"',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
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
		default: false,
		description: 'Whether to pass the update fields object as JSON',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFieldsUi',
		type: 'collection',
		required: true,
		placeholder: 'Add Options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
			},
			// {	// TODO: get cards from the UI (check the Slack node, specifically the blocks parameter under message: post)
			// 	displayName: 'Cards',
			// 	name: 'cards',
			// 	placeholder: 'Add Cards',
			// 	type: 'fixedCollection',
			// 	default: '',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	description: 'Rich, formatted and interactive cards that can be used to display UI elements such as: formatted texts, buttons, clickable images',
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
			// 					description: 'Name of the card',
			// 				},
			// 				{
			// 					displayName: 'Header',
			// 					name: 'header',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Header of the card',
			// 				},
			// 				{
			// 					displayName: 'Sections',
			// 					name: 'sections',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Sections of the card',
			// 				},
			// 				{
			// 					displayName: 'Actions',
			// 					name: 'cardActions',
			// 					type: 'json',
			// 					default: '',
			// 					description: 'Actions of the card',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
		],
	},
	{
		displayName: 'See <a href="https://developers.google.com/chat/reference/rest/v1/spaces.messages#Message" target="_blank">Google Chat Guide</a> To Creating Messages',
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
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields (JSON)',
		name: 'updateFieldsJson',
		type: 'json',
		required: true,
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Message input as JSON Object or JSON String',
	},
];
