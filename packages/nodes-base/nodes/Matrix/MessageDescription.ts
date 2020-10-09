import { INodeProperties } from 'n8n-workflow';

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
				name: 'Get all',
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
				]
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
				]
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

] as INodeProperties[];
