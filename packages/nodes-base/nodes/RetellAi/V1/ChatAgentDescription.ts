import type { INodeProperties } from 'n8n-workflow';

export const chatAgentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a chat agent',
				action: 'Create a chat agent',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a chat agent',
				action: 'Delete a chat agent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a chat agent by ID',
				action: 'Get a chat agent',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many chat agents',
				action: 'Get many chat agents',
			},
			{
				name: 'Get Versions',
				value: 'getVersions',
				description: 'Get all versions of a chat agent',
				action: 'Get chat agent versions',
			},
			{
				name: 'Publish',
				value: 'publish',
				description: 'Publish the latest version of a chat agent',
				action: 'Publish a chat agent',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a chat agent',
				action: 'Update a chat agent',
			},
		],
		default: 'create',
	},
];

export const chatAgentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                           chatAgent:create                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Response Engine Type',
		name: 'responseEngineType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
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
		description: 'The type of response engine to use for the chat agent',
	},
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
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
				resource: ['chatAgent'],
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
				resource: ['chatAgent'],
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
				resource: ['chatAgent'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				default: '',
				description: 'A reference name for the chat agent',
			},
			{
				displayName: 'Auto Close Message',
				name: 'autoCloseMessage',
				type: 'string',
				default: '',
				description: 'Message displayed when the chat is automatically closed',
			},
			{
				displayName: 'End Chat After Silence (ms)',
				name: 'endChatAfterSilenceMs',
				type: 'number',
				default: 3600000,
				description:
					'Silence duration in milliseconds before the chat is automatically closed. Min: 120000, Max: 259200000.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: 'en-US',
				options: [
					{ name: 'Bulgarian', value: 'bg-BG' },
					{ name: 'Catalan', value: 'ca-ES' },
					{ name: 'Chinese (Simplified)', value: 'zh-CN' },
					{ name: 'Czech', value: 'cs-CZ' },
					{ name: 'Danish', value: 'da-DK' },
					{ name: 'Dutch (Belgium)', value: 'nl-BE' },
					{ name: 'Dutch (Netherlands)', value: 'nl-NL' },
					{ name: 'English (Australia)', value: 'en-AU' },
					{ name: 'English (India)', value: 'en-IN' },
					{ name: 'English (New Zealand)', value: 'en-NZ' },
					{ name: 'English (UK)', value: 'en-GB' },
					{ name: 'English (US)', value: 'en-US' },
					{ name: 'Finnish', value: 'fi-FI' },
					{ name: 'French (Canada)', value: 'fr-CA' },
					{ name: 'French (France)', value: 'fr-FR' },
					{ name: 'German', value: 'de-DE' },
					{ name: 'Greek', value: 'el-GR' },
					{ name: 'Hindi', value: 'hi-IN' },
					{ name: 'Hungarian', value: 'hu-HU' },
					{ name: 'Indonesian', value: 'id-ID' },
					{ name: 'Italian', value: 'it-IT' },
					{ name: 'Japanese', value: 'ja-JP' },
					{ name: 'Korean', value: 'ko-KR' },
					{ name: 'Latvian', value: 'lv-LV' },
					{ name: 'Lithuanian', value: 'lt-LT' },
					{ name: 'Multi-Language', value: 'multi' },
					{ name: 'Norwegian', value: 'no-NO' },
					{ name: 'Polish', value: 'pl-PL' },
					{ name: 'Portuguese (Brazil)', value: 'pt-BR' },
					{ name: 'Portuguese (Portugal)', value: 'pt-PT' },
					{ name: 'Romanian', value: 'ro-RO' },
					{ name: 'Russian', value: 'ru-RU' },
					{ name: 'Slovak', value: 'sk-SK' },
					{ name: 'Spanish (Latin America)', value: 'es-419' },
					{ name: 'Spanish (Spain)', value: 'es-ES' },
					{ name: 'Swedish', value: 'sv-SE' },
					{ name: 'Thai', value: 'th-TH' },
					{ name: 'Turkish', value: 'tr-TR' },
					{ name: 'Vietnamese', value: 'vi-VN' },
				],
				description: 'The language for the chat agent',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-server.com/webhook',
				description: 'URL to receive chat event webhooks',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                            chatAgent:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the chat agent to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                          chatAgent:getMany                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['chatAgent'],
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
				resource: ['chatAgent'],
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
	/*                          chatAgent:update                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The ID of the chat agent to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['chatAgent'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				default: '',
				description: 'A reference name for the chat agent',
			},
			{
				displayName: 'Auto Close Message',
				name: 'autoCloseMessage',
				type: 'string',
				default: '',
				description: 'Message displayed when the chat is automatically closed',
			},
			{
				displayName: 'End Chat After Silence (ms)',
				name: 'endChatAfterSilenceMs',
				type: 'number',
				default: 3600000,
				description:
					'Silence duration in milliseconds before the chat is automatically closed. Min: 120000, Max: 259200000.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: 'en-US',
				options: [
					{ name: 'Bulgarian', value: 'bg-BG' },
					{ name: 'Catalan', value: 'ca-ES' },
					{ name: 'Chinese (Simplified)', value: 'zh-CN' },
					{ name: 'Czech', value: 'cs-CZ' },
					{ name: 'Danish', value: 'da-DK' },
					{ name: 'Dutch (Belgium)', value: 'nl-BE' },
					{ name: 'Dutch (Netherlands)', value: 'nl-NL' },
					{ name: 'English (Australia)', value: 'en-AU' },
					{ name: 'English (India)', value: 'en-IN' },
					{ name: 'English (New Zealand)', value: 'en-NZ' },
					{ name: 'English (UK)', value: 'en-GB' },
					{ name: 'English (US)', value: 'en-US' },
					{ name: 'Finnish', value: 'fi-FI' },
					{ name: 'French (Canada)', value: 'fr-CA' },
					{ name: 'French (France)', value: 'fr-FR' },
					{ name: 'German', value: 'de-DE' },
					{ name: 'Greek', value: 'el-GR' },
					{ name: 'Hindi', value: 'hi-IN' },
					{ name: 'Hungarian', value: 'hu-HU' },
					{ name: 'Indonesian', value: 'id-ID' },
					{ name: 'Italian', value: 'it-IT' },
					{ name: 'Japanese', value: 'ja-JP' },
					{ name: 'Korean', value: 'ko-KR' },
					{ name: 'Latvian', value: 'lv-LV' },
					{ name: 'Lithuanian', value: 'lt-LT' },
					{ name: 'Multi-Language', value: 'multi' },
					{ name: 'Norwegian', value: 'no-NO' },
					{ name: 'Polish', value: 'pl-PL' },
					{ name: 'Portuguese (Brazil)', value: 'pt-BR' },
					{ name: 'Portuguese (Portugal)', value: 'pt-PT' },
					{ name: 'Romanian', value: 'ro-RO' },
					{ name: 'Russian', value: 'ru-RU' },
					{ name: 'Slovak', value: 'sk-SK' },
					{ name: 'Spanish (Latin America)', value: 'es-419' },
					{ name: 'Spanish (Spain)', value: 'es-ES' },
					{ name: 'Swedish', value: 'sv-SE' },
					{ name: 'Thai', value: 'th-TH' },
					{ name: 'Turkish', value: 'tr-TR' },
					{ name: 'Vietnamese', value: 'vi-VN' },
				],
				description: 'The language for the chat agent',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-server.com/webhook',
				description: 'URL to receive chat event webhooks',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                          chatAgent:delete                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The ID of the chat agent to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                          chatAgent:publish                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
				operation: ['publish'],
			},
		},
		default: '',
		description: 'The ID of the chat agent to publish',
	},

	/* -------------------------------------------------------------------------- */
	/*                        chatAgent:getVersions                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chatAgent'],
				operation: ['getVersions'],
			},
		},
		default: '',
		description: 'The ID of the chat agent to get versions for',
	},
];
