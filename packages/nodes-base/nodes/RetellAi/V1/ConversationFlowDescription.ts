import type { INodeProperties } from 'n8n-workflow';

export const conversationFlowOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a conversation flow',
				action: 'Create a conversation flow',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a conversation flow',
				action: 'Delete a conversation flow',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a conversation flow by ID',
				action: 'Get a conversation flow',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many conversation flows',
				action: 'Get many conversation flows',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a conversation flow',
				action: 'Update a conversation flow',
			},
		],
		default: 'create',
	},
];

export const conversationFlowFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                        conversationFlow:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Start Speaker',
		name: 'startSpeaker',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
				operation: ['create'],
			},
		},
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
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
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
		description: 'The LLM model to use for the conversation flow',
	},
	{
		displayName: 'Nodes',
		name: 'nodes',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
				operation: ['create'],
			},
		},
		default: '[]',
		description:
			'JSON array of conversation flow nodes defining the flow structure',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Begin After User Silence (ms)',
				name: 'beginAfterUserSilenceMs',
				type: 'number',
				default: 0,
				description:
					'Milliseconds to wait before the agent speaks if waiting for the user',
			},
			{
				displayName: 'Default Dynamic Variables',
				name: 'defaultDynamicVariables',
				type: 'json',
				default: '{}',
				description:
					'Key-value pairs of default variables available throughout the flow',
			},
			{
				displayName: 'Global Prompt',
				name: 'globalPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description:
					'Instructions applied across all nodes in the flow',
			},
			{
				displayName: 'Knowledge Base IDs',
				name: 'knowledgeBaseIds',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of knowledge base IDs for RAG retrieval',
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
					'Controls response randomness. 0 = deterministic, 1 = random.',
			},
			{
				displayName: 'Start Node ID',
				name: 'startNodeId',
				type: 'string',
				default: '',
				description: 'The ID of the initial node in the flow',
			},
			{
				displayName: 'Tools',
				name: 'tools',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool objects available within the flow',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                         conversationFlow:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The unique ID of the conversation flow to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                       conversationFlow:getMany                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
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
				resource: ['conversationFlow'],
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
	/*                       conversationFlow:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The unique ID of the conversation flow to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Begin After User Silence (ms)',
				name: 'beginAfterUserSilenceMs',
				type: 'number',
				default: 0,
				description:
					'Milliseconds to wait before the agent speaks if waiting for the user',
			},
			{
				displayName: 'Default Dynamic Variables',
				name: 'defaultDynamicVariables',
				type: 'json',
				default: '{}',
				description:
					'Key-value pairs of default variables available throughout the flow',
			},
			{
				displayName: 'Global Prompt',
				name: 'globalPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description:
					'Instructions applied across all nodes in the flow',
			},
			{
				displayName: 'Knowledge Base IDs',
				name: 'knowledgeBaseIds',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of knowledge base IDs for RAG retrieval',
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
				description: 'The LLM model to use for the conversation flow',
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
					'Controls response randomness. 0 = deterministic, 1 = random.',
			},
			{
				displayName: 'Nodes',
				name: 'nodes',
				type: 'json',
				default: '[]',
				description:
					'JSON array of conversation flow nodes defining the flow structure',
			},
			{
				displayName: 'Start Node ID',
				name: 'startNodeId',
				type: 'string',
				default: '',
				description: 'The ID of the initial node in the flow',
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
			{
				displayName: 'Tools',
				name: 'tools',
				type: 'json',
				default: '[]',
				description:
					'JSON array of tool objects available within the flow',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                       conversationFlow:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation Flow ID',
		name: 'conversationFlowId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['conversationFlow'],
				operation: ['delete'],
			},
		},
		default: '',
		description: 'The unique ID of the conversation flow to delete',
	},
];
