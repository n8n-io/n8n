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
				description: 'Send a message into a room',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Reads messages from a room',
			},
			{
				name: 'Get all',
				value: 'getAll',
				description: 'Reads all messages from a room',
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
				type: 'string',
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
				default: 'Hello from n8n!',
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
/*                                 message:read                          */
/* ----------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
				]
			},
		},
		description: 'The token to start returning events from. This token can be obtained from a prev_batch token returned for each room by the sync API',
		required: true,
	},
	{
		displayName: 'From Token',
		name: 'from',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
				]
			},
		},
		description: 'The token to start returning events from. This token can be obtained from a prev_batch token returned for each room by the sync API',
		required: true,
	},

	
/* ----------------------------------------------------------------------- */
/*                                message:readAll                          */
/* ----------------------------------------------------------------------- */
	{
		displayName: 'Room ID',
		name: 'roomId',
		type: 'string',
		default: '',
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

] as INodeProperties[];
