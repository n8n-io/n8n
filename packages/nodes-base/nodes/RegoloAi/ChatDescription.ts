import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { sendErrorPostReceive } from './GenericFunctions';

export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['chat'] } },
		options: [
			{
				name: 'Complete',
				value: 'complete',
				action: 'Create a Chat Completion',
				description: 'Create one or more chat completions from a list of messages',
				routing: {
					request: { method: 'POST', url: '/v1/chat/completions' },
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
		],
		default: 'complete',
	},
];

const completeOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description: 'The model used to generate the completion.',
		displayOptions: { show: { resource: ['chat'], operation: ['complete'] } },
		default: '',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/v1/models',
					},
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'data' } },
							{
								type: 'filter',
								properties: {
									pass: "={{ $responseItem.type === 'chat' || ($responseItem.capabilities && $responseItem.capabilities.chat) || (!$responseItem.type && !$responseItem.capabilities) }}",
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{ $responseItem.name || $responseItem.id }}',
									value: '={{ $responseItem.id }}',
								},
							},
							{ type: 'sort', properties: { key: 'name' } },
						],
					},
				},
			},
		},
		options: [{ name: 'Custom (type manually)', value: '__custom__' }],
		routing: {
			send: {
				type: 'body',
				property: 'model',
				value: '={{ $value === "__custom__" ? $parameter["customModel"] : $value }}',
			},
		},
	},

	{
		displayName: 'Custom Model',
		name: 'customModel',
		type: 'string',
		default: '',
		placeholder: 'e.g. llama-3.1-70b-instruct',
		description: 'Type a custom model id',
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['complete'],
				model: ['__custom__'],
			},
		},
	},

	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'fixedCollection',
		typeOptions: { sortable: true, multipleValues: true },
		displayOptions: { show: { resource: ['chat'], operation: ['complete'] } },
		placeholder: 'Add Message',
		default: {},
		options: [
			{
				displayName: 'Messages',
				name: 'messages',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{ name: 'Assistant', value: 'assistant' },
							{ name: 'System', value: 'system' },
							{ name: 'User', value: 'user' },
						],
						default: 'user',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'messages',
				value: '={{ $value.messages }}',
			},
		},
	},
];

const sharedOperations: INodeProperties[] = [
	{
		displayName: 'Simplify',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: { show: { operation: ['complete'], resource: ['chat'] } },
		description: 'Whether to return a simplified version of the response instead of the raw data',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: { value: '={{ { "data": $response.body.choices } }}' },
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: { property: 'data' },
					},
					async function (items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.simplifyOutput === false) return items;
						return items.map((item) => ({
							json: {
								...item.json,
								message: item.json.message,
							},
						}));
					},
				],
			},
		},
	},

	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		displayOptions: { show: { operation: ['complete'], resource: ['chat'] } },
		options: [
			{
				displayName: 'Echo Prompt',
				name: 'echo',
				type: 'boolean',
				default: false,
				description: 'Echo the prompt back in addition to the completion',
				routing: { send: { type: 'body', property: 'echo' } },
			},
			{
				displayName: 'Frequency Penalty',
				name: 'frequency_penalty',
				type: 'number',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				routing: { send: { type: 'body', property: 'frequency_penalty' } },
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 256,
				typeOptions: { maxValue: 32768 },
				description: 'Maximum tokens to generate in the completion.',
				routing: { send: { type: 'body', property: 'max_tokens' } },
			},
			{
				displayName: 'Number of Completions',
				name: 'n',
				type: 'number',
				default: 1,
				routing: { send: { type: 'body', property: 'n' } },
			},
			{
				displayName: 'Presence Penalty',
				name: 'presence_penalty',
				type: 'number',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				routing: { send: { type: 'body', property: 'presence_penalty' } },
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.7,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				routing: { send: { type: 'body', property: 'temperature' } },
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description: 'Nucleus sampling.',
				routing: { send: { type: 'body', property: 'top_p' } },
			},
			{
				displayName: 'Stream (SSE-like)',
				name: 'stream',
				type: 'boolean',
				default: false,
				description: 'Return incremental deltas (one JSON line per chunk).',
				routing: { send: { type: 'body', property: 'stream' } },
			},
		],
	},
];

export const chatFields: INodeProperties[] = [
	/* ------------------------------ chat:complete ------------------------------ */
	...completeOperations,

	/* -------------------------------- chat:ALL -------------------------------- */
	...sharedOperations,
];
