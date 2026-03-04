import type { INodeProperties } from 'n8n-workflow';

export const pulseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['pulse'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add pulse to case',
				action: 'Add pulse to case',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get pulse of case',
				action: 'Get pulse of case',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Reply to pulse',
				action: 'Reply to pulse',
			},
		],
		default: 'add',
	},
];

export const pulseFields: INodeProperties[] = [
	// ----------------------------------
	//         pulse:add
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pulse'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The ID of the case (context) to add pulse message to',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pulse'],
				operation: ['add'],
			},
		},
		default: '',
		description: 'The pulse message text',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['pulse'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Parent Message ID',
				name: 'parentMessageId',
				type: 'string',
				default: '',
				description: 'The ID of the parent message if replying to a pulse',
			},
		],
	},

	// ----------------------------------
	//         pulse:get
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pulse'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the case to get pulses from',
	},

	// ----------------------------------
	//         pulse:reply
	// ----------------------------------
	{
		displayName: 'Case ID',
		name: 'caseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pulse'],
				operation: ['reply'],
			},
		},
		default: '',
		description: 'The ID of the case (context)',
	},
	{
		displayName: 'Parent Message ID',
		name: 'parentMessageId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pulse'],
				operation: ['reply'],
			},
		},
		default: '',
		description: 'The ID of the parent pulse message to reply to',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pulse'],
				operation: ['reply'],
			},
		},
		default: '',
		description: 'The reply message text',
	},
];
