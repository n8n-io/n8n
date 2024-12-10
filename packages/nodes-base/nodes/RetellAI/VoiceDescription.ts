import type { INodeProperties } from 'n8n-workflow';

export const voiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['voice'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a voice',
				routing: {
					request: {
						method: 'GET',
						url: '=/get-voice/{{$parameter.voiceId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many voices',
				routing: {
					request: {
						method: 'GET',
						url: '/list-voices',
					},
				},
			},
		],
		default: 'getAll',
	},
];

export const voiceFields: INodeProperties[] = [
	// Get operation fields
	{
		displayName: 'Voice ID',
		name: 'voiceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Unique ID of the voice to retrieve',
	},
	{
		displayName: 'Return Provider Details',
		name: 'returnProviderDetails',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['get', 'getAll'],
			},
		},
		default: false,
		description: 'Whether to return voice provider details',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Filter By Provider',
				name: 'provider',
				type: 'multiOptions',
				options: [
					{
						name: 'Eleven Labs',
						value: 'elevenlabs',
					},
					{
						name: 'OpenAI',
						value: 'openai',
					},
					{
						name: 'Deepgram',
						value: 'deepgram',
					},
				],
				default: [],
				description: 'Filter voices by provider',
			},
			{
				displayName: 'Filter By Gender',
				name: 'gender',
				type: 'options',
				options: [
					{
						name: 'Male',
						value: 'male',
					},
					{
						name: 'Female',
						value: 'female',
					},
				],
				default: 'female',
				description: 'Filter voices by gender',
			},
			{
				displayName: 'Filter By Accent',
				name: 'accent',
				type: 'string',
				default: '',
				description: 'Filter voices by accent (e.g., American, British)',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['get', 'getAll'],
			},
		},
		options: [
			{
				displayName: 'Include Preview Audio',
				name: 'includePreviewAudio',
				type: 'boolean',
				default: false,
				description: 'Whether to include preview audio URL in response',
			},
			{
				displayName: 'Include Voice Models',
				name: 'includeVoiceModels',
				type: 'boolean',
				default: false,
				description: 'Whether to include available voice models in response (only applicable for certain providers)',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{
						name: 'English (UK)',
						value: 'en-GB',
					},
					{
						name: 'English (US)',
						value: 'en-US',
					},
					{
						name: 'French',
						value: 'fr-FR',
					},
					{
						name: 'German',
						value: 'de-DE',
					},
					{
						name: 'Italian',
						value: 'it-IT',
					},
					{
						name: 'Japanese',
						value: 'ja-JP',
					},
					{
						name: 'Korean',
						value: 'ko-KR',
					},
					{
						name: 'Portuguese',
						value: 'pt-BR',
					},
					{
						name: 'Spanish',
						value: 'es-ES',
					},
				],
				default: 'en-GB',
				description: 'Filter voices by language',
			},
		],
	},
];