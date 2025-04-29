import type { INodeProperties } from 'n8n-workflow';

export const promptOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['prompt'],
			},
		},
		options: [
			{
				name: 'Complete (v0)',
				value: 'completeV0',
				description: 'Complete a prompt (v0)',
				action: 'Complete a prompt v0',
			},
			{
				name: 'Complete (v1)',
				value: 'completeV1',
				description: 'Complete a prompt (v1)',
				action: 'Complete a prompt v1',
			},
		],
		default: 'completeV1',
	},
];

export const promptFields: INodeProperties[] = [
	// Prompt v0 parameters
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['completeV0'],
				resource: ['prompt'],
			},
		},
		default: '',
		description: 'Model identifier to use for completion',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['completeV0'],
				resource: ['prompt'],
			},
		},
		default: '',
		description: 'The prompt text for completion',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['completeV0'],
				resource: ['prompt'],
			},
		},
		options: [
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
				},
				default: 1,
				description: 'Controls randomness in the response',
			},
			{
				displayName: 'Max Tokens',
				name: 'max_tokens',
				type: 'number',
				default: 100,
				description: 'Maximum number of tokens to generate',
			},
		],
	},
	// Prompt v1 parameters
	{
		displayName: 'Models',
		name: 'models',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['completeV1'],
				resource: ['prompt'],
			},
		},
		default: '',
		description: 'Comma-separated list of model identifiers (max 4)',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['completeV1'],
				resource: ['prompt'],
			},
		},
		default: '',
		description: 'The prompt text for completion',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsV1',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['completeV1'],
				resource: ['prompt'],
			},
		},
		options: [
			{
				displayName: 'File URLs',
				name: 'file_urls',
				type: 'string',
				default: '',
				description: 'Comma-separated list of file URLs (max 4)',
			},
			{
				displayName: 'Images',
				name: 'images',
				type: 'string',
				default: '',
				description: 'Comma-separated list of image URLs',
			},
			{
				displayName: 'YouTube URLs',
				name: 'youtube_urls',
				type: 'string',
				default: '',
				description: 'Comma-separated list of YouTube URLs (max 4)',
			},
			{
				displayName: 'Display Transcripts',
				name: 'display_transcripts',
				type: 'boolean',
				default: false,
				description: 'Whether to return transcripts of the files',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 2,
				},
				default: 1,
				description: 'Controls randomness in the response',
			},
			{
				displayName: 'Max Tokens',
				name: 'max_tokens',
				type: 'number',
				default: 100,
				description: 'Maximum number of tokens to generate',
			},
		],
	},
];
