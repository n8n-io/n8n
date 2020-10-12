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
				description: 'Send a message to a room',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Gets all messages from a room',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageFields = [

	/* -------------------------------------------------------------------------- */
	/*                              message:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		placeholder: '!123abc:matrix.org',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'message',
				],
			},
		},
		required: true,
		description: 'The channel to send the message to.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		placeholder: 'Hello from n8n!',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'message',
				],
			},
		},
		description: 'The text to send.',
	},


	/* ----------------------------------------------------------------------- */
	/*                                message:getAll                          */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'The token to start returning events from. This token can be obtained from a prev_batch token returned for each room by the sync API',
		required: true,
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'If all results should be returned or only up to a given limit.',
		required: true,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Other Options',
		name: 'otherOptions',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		description: 'Other options',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description: 'A JSON RoomEventFilter to filter returned events with. More information can be found on this <a href="https://matrix.org/docs/spec/client_server/r0.6.0" target="_blank">page</a>.',
				placeholder: '{"contains_url":true,"types":["m.room.message", "m.sticker"]}',
			},
		],
	},


] as INodeProperties[];
