import type { INodeProperties } from 'n8n-workflow';

export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new chat session',
				action: 'Create a chat',
			},
			{
				name: 'Create Completion',
				value: 'createCompletion',
				description: 'Send a message and get an agent response',
				action: 'Create a chat completion',
			},
			{
				name: 'End',
				value: 'end',
				description: 'End an ongoing chat session',
				action: 'End a chat',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a chat by ID',
				action: 'Get a chat',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many chats',
				action: 'Get many chats',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a chat',
				action: 'Update a chat',
			},
		],
		default: 'create',
	},
];

export const chatFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                              chat:create                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat Agent ID',
		name: 'chatAgentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The chat agent ID to use for the chat session',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Agent Version',
				name: 'agentVersion',
				type: 'number',
				default: 0,
				description: 'Specific agent version to use. Defaults to latest if omitted.',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description:
					'Custom key-value pairs to store with the chat (e.g., customer ID). Max 50kB.',
			},
			{
				displayName: 'Retell LLM Dynamic Variables',
				name: 'retellLlmDynamicVariables',
				type: 'json',
				default: '{}',
				description:
					'Key-value string pairs injected into Response Engine prompts and tool descriptions',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                          chat:createCompletion                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['createCompletion'],
			},
		},
		default: '',
		description: 'The ID of the chat to create a completion for',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['createCompletion'],
			},
		},
		default: '',
		description: 'The user message to generate an agent chat completion',
	},

	/* -------------------------------------------------------------------------- */
	/*                                chat:get                                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'The ID of the chat to retrieve',
	},

	/* -------------------------------------------------------------------------- */
	/*                              chat:getMany                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['chat'],
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
				resource: ['chat'],
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
	{
		displayName: 'Filter Fields',
		name: 'filterFields',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				default: 'descending',
				options: [
					{
						name: 'Ascending',
						value: 'ascending',
					},
					{
						name: 'Descending',
						value: 'descending',
					},
				],
				description: 'Sort order for returned chats by start_timestamp',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                              chat:update                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'The ID of the chat to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Custom Attributes',
				name: 'customAttributes',
				type: 'json',
				default: '{}',
				description:
					'Custom attributes for the chat. Values can be string, number, or boolean.',
			},
			{
				displayName: 'Data Storage Setting',
				name: 'dataStorageSetting',
				type: 'options',
				default: 'everything',
				options: [
					{
						name: 'Everything',
						value: 'everything',
					},
					{
						name: 'Basic Attributes Only',
						value: 'basic_attributes_only',
					},
				],
				description: 'Controls data retention for the chat',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'json',
				default: '{}',
				description: 'Custom key-value pairs to store with the chat. Max 50kB.',
			},
			{
				displayName: 'Override Dynamic Variables',
				name: 'overrideDynamicVariables',
				type: 'json',
				default: '{}',
				description:
					'Overrides agent-level dynamic variables. Set to null to remove. Only delta changes needed.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                chat:end                                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['end'],
			},
		},
		default: '',
		description: 'The ID of the chat to end',
	},
];
