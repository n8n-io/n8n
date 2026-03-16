import type { INodeProperties } from 'n8n-workflow';

export const retellLlmOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['retellLlm'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a Retell LLM',
				action: 'Create a retell llm',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a Retell LLM',
				action: 'Delete a retell llm',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a Retell LLM by ID',
				action: 'Get a retell llm',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many Retell LLMs',
				action: 'Get many retell llms',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a Retell LLM',
				action: 'Update a retell llm',
			},
		],
		default: 'create',
	},
];

export const retellLlmFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                            retellLlm:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['retellLlm'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Claude 4.5 Haiku',
				value: 'claude-4.5-haiku',
			},
			{
				name: 'Claude 4.5 Sonnet',
				value: 'claude-4.5-sonnet',
			},
			{
				name: 'Gemini 2.5 Flash',
				value: 'gemini-2.5-flash',
			},
			{
				name: 'Gemini 2.5 Flash Lite',
				value: 'gemini-2.5-flash-lite',
			},
			{
				name: 'Gemini 3.0 Flash',
				value: 'gemini-3.0-flash',
			},
			{
				name: 'GPT-4.1',
				value: 'gpt-4.1',
			},
			{
				name: 'GPT-4.1 Mini',
				value: 'gpt-4.1-mini',
			},
			{
				name: 'GPT-4.1 Nano',
				value: 'gpt-4.1-nano',
			},
			{
				name: 'GPT-5',
				value: 'gpt-5',
			},
			{
				name: 'GPT-5 Mini',
				value: 'gpt-5-mini',
			},
			{
				name: 'GPT-5 Nano',
				value: 'gpt-5-nano',
			},
			{
				name: 'GPT-5.1',
				value: 'gpt-5.1',
			},
			{
				name: 'GPT-5.2',
				value: 'gpt-5.2',
			},
		],
		default: 'gpt-4.1',
		description: 'The underlying text LLM model to use',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['retellLlm'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Begin Message',
				name: 'beginMessage',
				type: 'string',
				default: '',
				description:
					"The agent's opening statement when a call starts. If empty, the agent waits for the user to speak first.",
			},
			{
				displayName: 'General Prompt',
				name: 'generalPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description:
					'System prompt appended to the agent regardless of current state',
			},
			{
				displayName: 'General Tools',
				name: 'generalTools',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool objects available to the LLM across all states',
			},
			{
				displayName: 'Inbound Dynamic Variables Webhook URL',
				name: 'inboundDynamicVariablesWebhookUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-server.com/webhook',
				description:
					'Webhook URL to fetch dynamic variables for inbound calls',
			},
			{
				displayName: 'Model Temperature',
				name: 'modelTemperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
				default: 0,
				description:
					'Controls randomness of responses. 0 = deterministic, 1 = random.',
			},
			{
				displayName: 'S2S Model',
				name: 's2sModel',
				type: 'options',
				options: [
					{
						name: 'GPT-4o Mini Realtime',
						value: 'gpt-4o-mini-realtime',
					},
					{
						name: 'GPT-4o Realtime',
						value: 'gpt-4o-realtime',
					},
					{
						name: 'GPT Realtime',
						value: 'gpt-realtime',
					},
					{
						name: 'GPT Realtime Mini',
						value: 'gpt-realtime-mini',
					},
				],
				default: 'gpt-4o-realtime',
				description: 'Speech-to-speech model to use',
			},
			{
				displayName: 'Start Speaker',
				name: 'startSpeaker',
				type: 'options',
				options: [
					{
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'agent',
				description: 'Who initiates the conversation',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                              retellLlm:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['retellLlm'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The unique ID of the Retell LLM to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                            retellLlm:getMany                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['retellLlm'],
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
				resource: ['retellLlm'],
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
	/*                            retellLlm:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['retellLlm'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The unique ID of the Retell LLM to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['retellLlm'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Begin Message',
				name: 'beginMessage',
				type: 'string',
				default: '',
				description:
					"The agent's opening statement when a call starts. If empty, the agent waits for the user to speak first.",
			},
			{
				displayName: 'General Prompt',
				name: 'generalPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description:
					'System prompt appended to the agent regardless of current state',
			},
			{
				displayName: 'General Tools',
				name: 'generalTools',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool objects available to the LLM across all states',
			},
			{
				displayName: 'Inbound Dynamic Variables Webhook URL',
				name: 'inboundDynamicVariablesWebhookUrl',
				type: 'string',
				default: '',
				placeholder: 'https://your-server.com/webhook',
				description:
					'Webhook URL to fetch dynamic variables for inbound calls',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Claude 4.5 Haiku',
						value: 'claude-4.5-haiku',
					},
					{
						name: 'Claude 4.5 Sonnet',
						value: 'claude-4.5-sonnet',
					},
					{
						name: 'Gemini 2.5 Flash',
						value: 'gemini-2.5-flash',
					},
					{
						name: 'Gemini 2.5 Flash Lite',
						value: 'gemini-2.5-flash-lite',
					},
					{
						name: 'Gemini 3.0 Flash',
						value: 'gemini-3.0-flash',
					},
					{
						name: 'GPT-4.1',
						value: 'gpt-4.1',
					},
					{
						name: 'GPT-4.1 Mini',
						value: 'gpt-4.1-mini',
					},
					{
						name: 'GPT-4.1 Nano',
						value: 'gpt-4.1-nano',
					},
					{
						name: 'GPT-5',
						value: 'gpt-5',
					},
					{
						name: 'GPT-5 Mini',
						value: 'gpt-5-mini',
					},
					{
						name: 'GPT-5 Nano',
						value: 'gpt-5-nano',
					},
					{
						name: 'GPT-5.1',
						value: 'gpt-5.1',
					},
					{
						name: 'GPT-5.2',
						value: 'gpt-5.2',
					},
				],
				default: 'gpt-4.1',
				description: 'The underlying text LLM model to use',
			},
			{
				displayName: 'Model Temperature',
				name: 'modelTemperature',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 1,
				},
				default: 0,
				description:
					'Controls randomness of responses. 0 = deterministic, 1 = random.',
			},
			{
				displayName: 'S2S Model',
				name: 's2sModel',
				type: 'options',
				options: [
					{
						name: 'GPT-4o Mini Realtime',
						value: 'gpt-4o-mini-realtime',
					},
					{
						name: 'GPT-4o Realtime',
						value: 'gpt-4o-realtime',
					},
					{
						name: 'GPT Realtime',
						value: 'gpt-realtime',
					},
					{
						name: 'GPT Realtime Mini',
						value: 'gpt-realtime-mini',
					},
				],
				default: 'gpt-4o-realtime',
				description: 'Speech-to-speech model to use',
			},
			{
				displayName: 'Start Speaker',
				name: 'startSpeaker',
				type: 'options',
				options: [
					{
						name: 'Agent',
						value: 'agent',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'agent',
				description: 'Who initiates the conversation',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                            retellLlm:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['retellLlm'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The unique ID of the Retell LLM to delete. Deletes all versions.',
	},
];
