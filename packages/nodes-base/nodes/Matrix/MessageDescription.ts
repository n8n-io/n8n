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
				name: 'Read',
				value: 'read',
				description: 'Reads messages from a room',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message into a room',
			},
		],
		default: 'send',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageFields = [

/* -------------------------------------------------------------------------- */
/*                                message:send                                */
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
							'send',
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
							'send',
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
					'read',
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
					'read',
				]
			},
		},
		description: 'The token to start returning events from. This token can be obtained from a prev_batch token returned for each room by the sync API',
		required: true,
	},
] as INodeProperties[];
