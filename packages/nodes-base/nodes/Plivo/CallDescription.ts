import {
	INodeProperties,
} from 'n8n-workflow';

export const callOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'call',
				],
			},
		},
		options: [
			{
				name: 'Make',
				value: 'make',
				description: 'Make a voice call',
				action: 'Make a call',
			},
		],
		default: 'make',
	},
];

export const callFields: INodeProperties[] = [
	// ----------------------------------
	//           call: make
	// ----------------------------------
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		default: '',
		placeholder: '+14156667777',
		description: 'Caller ID for the call to make',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'call',
				],
				operation: [
					'make',
				],
			},
		},
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		placeholder: '+14156667778',
		required: true,
		description: 'Phone number to make the call to',
		displayOptions: {
			show: {
				resource: [
					'call',
				],
				operation: [
					'make',
				],
			},
		},
	},
	{
		displayName: 'Answer Method',
		name: 'answer_method',
		type: 'options',
		required: true,
		description: 'HTTP verb to be used when invoking the Answer URL',
		default: 'POST',
		options: [
			{
				name: 'GET',
				value: 'GET',
			},
			{
				name: 'POST',
				value: 'POST',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'call',
				],
				operation: [
					'make',
				],
			},
		},
	},
	{
		displayName: 'Answer URL',
		name: 'answer_url',
		type: 'string',
		default: '',
		description: 'URL to be invoked by Plivo once the call is answered. It should return the XML to handle the call once answered.',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'call',
				],
				operation: [
					'make',
				],
			},
		},
	},
];
