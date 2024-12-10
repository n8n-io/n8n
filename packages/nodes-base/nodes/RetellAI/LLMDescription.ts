import type { INodeProperties } from 'n8n-workflow';

export const llmOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['llm'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a retell LLM',
				routing: {
					request: {
						method: 'POST',
						url: '/create-retell-llm',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a retell LLM',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/delete-retell-llm/{{$parameter.llmId}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a retell LLM',
				routing: {
					request: {
						method: 'GET',
						url: '=/get-retell-llm/{{$parameter.llmId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				// eslint-disable-next-line n8n-nodes-base/node-param-operation-option-action-miscased
				action: 'Get many retell LLMs',
				routing: {
					request: {
						method: 'GET',
						url: '/list-retell-llms',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a retell LLM',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/update-retell-llm/{{$parameter.llmId}}',
					},
				},
			},
		],
		default: 'create',
	},
];

export const llmFields: INodeProperties[] = [
	// Create operation fields
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['llm'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'GPT-4',
				value: 'gpt-4o',
			},
			{
				name: 'GPT-4 Mini',
				value: 'gpt-4o-mini',
			},
			{
				name: 'Claude 3.5 Sonnet',
				value: 'claude-3.5-sonnet',
			},
			{
				name: 'Claude 3 Haiku',
				value: 'claude-3-haiku',
			},
		],
		default: 'gpt-4o',
		description: 'The underlying text LLM to use',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['llm'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Model Temperature',
				name: 'modelTemperature',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
				description: 'Controls randomness of response (0-1)',
			},
			{
				displayName: 'Tool Call Strict Mode',
				name: 'toolCallStrictMode',
				type: 'boolean',
				default: false,
				description: 'Whether to enforce strict JSON schema for tool calls',
			},
			{
				displayName: 'General Prompt',
				name: 'generalPrompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'General prompt appended to system prompt',
			},
		],
	},
	// Get & Delete operation fields
	{
		displayName: 'LLM ID',
		name: 'llmId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['llm'],
				operation: ['get', 'delete', 'update'],
			},
		},
		default: '',
		description: 'The ID of the Retell LLM',
	},
	// Update operation fields
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['llm'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
                default: 'gpt-4o',
				options: [
					{
						name: 'GPT-4',
						value: 'gpt-4o',
					},
					{
						name: 'GPT-4 Mini',
						value: 'gpt-4o-mini',
					},
					{
						name: 'Claude 3.5 Sonnet',
						value: 'claude-3.5-sonnet',
					},
					{
						name: 'Claude 3 Haiku',
						value: 'claude-3-haiku',
					},
				],
			},
			{
				displayName: 'Model Temperature',
				name: 'modelTemperature',
                default: 0,
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
			},
			{
				displayName: 'General Prompt',
				name: 'generalPrompt',
				type: 'string',
                default: '',
				typeOptions: {
					rows: 4,
				},
			},
		],
	},
];