import type { INodeProperties } from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Send a message to a room',
				action: 'Create a message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many messages from a room',
				action: 'Get many messages',
			},
		],
		default: 'create',
	},
];

export const messageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                              message:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room Name or ID',
		name: 'roomId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		placeholder: '!123abc:matrix.org',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['message'],
			},
		},
		required: true,
		description:
			'The channel to send the message to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		placeholder: 'Hello from n8n!',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['message'],
			},
		},
		description: 'The text to send',
	},
	{
		displayName: 'Message Type',
		name: 'messageType',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['message'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'Emote',
				value: 'm.emote',
				description: 'Perform an action (similar to /me in IRC)',
			},
			{
				name: 'Notice',
				value: 'm.notice',
				description: 'Send a notice',
			},
			{
				name: 'Text',
				value: 'm.text',
				description: 'Send a text message',
			},
		],
		default: 'm.text',
		description: 'The type of message to send',
	},
	{
		displayName: 'Message Format',
		name: 'messageFormat',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['message'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'Plain Text',
				value: 'plain',
				description: 'Text only',
			},
			{
				name: 'HTML',
				value: 'org.matrix.custom.html',
				description: 'HTML-formatted text',
			},
		],
		default: 'plain',
		description: "The format of the message's body",
	},
	{
		displayName: 'Fallback Text',
		name: 'fallbackText',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
				messageFormat: ['org.matrix.custom.html'],
			},
		},
		type: 'string',
		description:
			'A plain text message to display in case the HTML cannot be rendered by the Matrix client',
	},

	/* ----------------------------------------------------------------------- */
	/*                                message:getAll                           */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'Room Name or ID',
		name: 'roomId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
		description:
			'The token to start returning events from. This token can be obtained from a prev_batch token returned for each room by the sync API. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
		required: true,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Other Options',
		name: 'otherOptions',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
		default: {},
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description:
					'A JSON RoomEventFilter to filter returned events with. More information can be found on this <a href="https://matrix.org/docs/spec/client_server/r0.6.0">page</a>.',
				placeholder: '{"contains_url":true,"types":["m.room.message", "m.sticker"]}',
			},
		],
	},
];
