import type { INodeProperties } from 'n8n-workflow';

export const agentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['agent'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an agent',
				action: 'Create an agent',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an agent',
				action: 'Delete an agent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an agent by ID',
				action: 'Get an agent',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many agents',
				action: 'Get many agents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an agent',
				action: 'Update an agent',
			},
		],
		default: 'create',
	},
];

export const agentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                              agent:create                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Voice ID',
		name: 'voiceId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The voice ID to use for the agent (from Retell AI voice library)',
	},
	{
		displayName: 'Response Engine Type',
		name: 'responseEngineType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Conversation Flow',
				value: 'conversation-flow',
			},
			{
				name: 'Custom LLM',
				value: 'custom-llm',
			},
			{
				name: 'Retell LLM',
				value: 'retell-llm',
			},
		],
		default: 'retell-llm',
		description: 'The type of response engine to use for the agent',
	},
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
				responseEngineType: ['retell-llm'],
			},
		},
		default: '',
		description: 'The ID of the Retell LLM to use',
	},
	{
		displayName: 'LLM WebSocket URL',
		name: 'llmWebsocketUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
				responseEngineType: ['custom-llm'],
			},
		},
		default: '',
		placeholder: 'wss://your-server.com/llm-websocket',
		description: 'The WebSocket URL for the custom LLM',
	},
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
				responseEngineType: ['conversation-flow'],
			},
		},
		default: '',
		description: 'The ID of the conversation flow to use',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				default: '',
				description: 'The name of the agent',
			},
			{
				displayName: 'Begin Message',
				name: 'beginMessage',
				type: 'string',
				default: '',
				description:
					'The initial message the agent speaks when a call starts. If empty, the agent waits for the user to speak first.',
			},
			{
				displayName: 'Enable Voicemail Detection',
				name: 'enableVoicemailDetection',
				type: 'boolean',
				default: false,
				description: 'Whether to enable voicemail detection for the agent',
			},
			{
				displayName: 'End Call After Silence (ms)',
				name: 'endCallAfterSilenceMs',
				type: 'number',
				default: 30000,
				description:
					'Duration of silence in milliseconds before the call is automatically ended',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: 'en-US',
				options: [
					{ name: 'Chinese (Mandarin)', value: 'zh-CN' },
					{ name: 'Dutch', value: 'nl-NL' },
					{ name: 'English (Australia)', value: 'en-AU' },
					{ name: 'English (India)', value: 'en-IN' },
					{ name: 'English (UK)', value: 'en-GB' },
					{ name: 'English (US)', value: 'en-US' },
					{ name: 'French', value: 'fr-FR' },
					{ name: 'German', value: 'de-DE' },
					{ name: 'Hindi', value: 'hi-IN' },
					{ name: 'Italian', value: 'it-IT' },
					{ name: 'Japanese', value: 'ja-JP' },
					{ name: 'Korean', value: 'ko-KR' },
					{ name: 'Polish', value: 'pl-PL' },
					{ name: 'Portuguese (Brazil)', value: 'pt-BR' },
					{ name: 'Portuguese (Portugal)', value: 'pt-PT' },
					{ name: 'Russian', value: 'ru-RU' },
					{ name: 'Spanish', value: 'es-ES' },
					{ name: 'Spanish (Latin America)', value: 'es-419' },
					{ name: 'Swedish', value: 'sv-SE' },
					{ name: 'Turkish', value: 'tr-TR' },
				],
				description: 'The language for the agent',
			},
			{
				displayName: 'Max Call Duration (ms)',
				name: 'maxCallDurationMs',
				type: 'number',
				default: 3600000,
				description: 'Maximum duration of a call in milliseconds',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-server.com/webhook',
				description: 'URL to receive call event webhooks',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                agent:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the agent to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                              agent:getMany                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getMany'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                              agent:update                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The ID of the agent to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				default: '',
				description: 'The name of the agent',
			},
			{
				displayName: 'Begin Message',
				name: 'beginMessage',
				type: 'string',
				default: '',
				description:
					'The initial message the agent speaks when a call starts. If empty, the agent waits for the user to speak first.',
			},
			{
				displayName: 'Enable Voicemail Detection',
				name: 'enableVoicemailDetection',
				type: 'boolean',
				default: false,
				description: 'Whether to enable voicemail detection for the agent',
			},
			{
				displayName: 'End Call After Silence (ms)',
				name: 'endCallAfterSilenceMs',
				type: 'number',
				default: 30000,
				description:
					'Duration of silence in milliseconds before the call is automatically ended',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: 'en-US',
				options: [
					{ name: 'Chinese (Mandarin)', value: 'zh-CN' },
					{ name: 'Dutch', value: 'nl-NL' },
					{ name: 'English (Australia)', value: 'en-AU' },
					{ name: 'English (India)', value: 'en-IN' },
					{ name: 'English (UK)', value: 'en-GB' },
					{ name: 'English (US)', value: 'en-US' },
					{ name: 'French', value: 'fr-FR' },
					{ name: 'German', value: 'de-DE' },
					{ name: 'Hindi', value: 'hi-IN' },
					{ name: 'Italian', value: 'it-IT' },
					{ name: 'Japanese', value: 'ja-JP' },
					{ name: 'Korean', value: 'ko-KR' },
					{ name: 'Polish', value: 'pl-PL' },
					{ name: 'Portuguese (Brazil)', value: 'pt-BR' },
					{ name: 'Portuguese (Portugal)', value: 'pt-PT' },
					{ name: 'Russian', value: 'ru-RU' },
					{ name: 'Spanish', value: 'es-ES' },
					{ name: 'Spanish (Latin America)', value: 'es-419' },
					{ name: 'Swedish', value: 'sv-SE' },
					{ name: 'Turkish', value: 'tr-TR' },
				],
				description: 'The language for the agent',
			},
			{
				displayName: 'Max Call Duration (ms)',
				name: 'maxCallDurationMs',
				type: 'number',
				default: 3600000,
				description: 'Maximum duration of a call in milliseconds',
			},
			{
				displayName: 'Voice ID',
				name: 'voiceId',
				type: 'string',
				default: '',
				description: 'The voice ID to use for the agent',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-server.com/webhook',
				description: 'URL to receive call event webhooks',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                              agent:delete                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The ID of the agent to delete',
	},
];
