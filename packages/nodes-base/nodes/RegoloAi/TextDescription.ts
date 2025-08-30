import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { sendErrorPostReceive } from './GenericFunctions';

export const textOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['text'] } },
		options: [
			{
				name: 'Complete',
				value: 'complete',
				action: 'Create a Completion',
				description: 'Create one or more completions for a given prompt',
				routing: {
					request: { method: 'POST', url: '/v1/completions' },
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
			{
				name: 'Embeddings',
				value: 'embed',
				action: 'Create Embeddings',
				description: 'Generate vector embeddings for text input',
				routing: {
					request: { method: 'POST', url: '/v1/embeddings' },
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
		],
		default: 'complete',
	},
];

/* -------------------------------------------------------------------------- */
/*                               text:complete                                */
/* -------------------------------------------------------------------------- */
const completeOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description: 'The model which will generate the completion.',
		displayOptions: { show: { operation: ['complete'], resource: ['text'] } },
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
									pass: "={{ $responseItem.type === 'text' || $responseItem.type === 'chat' || ($responseItem.capabilities && ($responseItem.capabilities.text || $responseItem.capabilities.chat)) || (!$responseItem.type && !$responseItem.capabilities) }}",
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
				value: '={{ $value === "__custom__" ? $parameter["customTextModel"] : $value }}',
			},
		},
	},
	{
		displayName: 'Custom Model',
		name: 'customTextModel',
		type: 'string',
		description: 'Type a custom model id',
		placeholder: 'e.g. llama-3.1-8b-instruct',
		displayOptions: {
			show: { resource: ['text'], operation: ['complete'], model: ['__custom__'] },
		},
		default: '',
	},

	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		description: 'The prompt to generate completion(s) for',
		placeholder: 'e.g. Say this is a test',
		displayOptions: { show: { resource: ['text'], operation: ['complete'] } },
		default: '',
		typeOptions: { rows: 2 },
		routing: { send: { type: 'body', property: 'prompt' } },
	},
];

/* -------------------------------------------------------------------------- */
/*                               text:embeddings                               */
/* -------------------------------------------------------------------------- */
const embedOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'embedModel',
		type: 'options',
		description: 'The embedding model to use',
		displayOptions: { show: { operation: ['embed'], resource: ['text'] } },
		default: '',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/v1/model/info',
					},
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'data' } },
							{
								type: 'filter',
								properties: {
									pass: "={{ String($responseItem.model_info?.mode || '').toLowerCase() === 'embedding' }}",
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{ $responseItem.model_name }}',
									value: '={{ $responseItem.model_name }}',
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
				value: '={{ $value === "__custom__" ? $parameter["customEmbedModel"] : $value }}',
			},
		},
	},
	{
		displayName: 'Custom Model',
		name: 'customEmbedModel',
		type: 'string',
		description: 'Type a custom embedding model id',
		placeholder: 'e.g. gte-qwen2',
		displayOptions: {
			show: { resource: ['text'], operation: ['embed'], embedModel: ['__custom__'] },
		},
		default: '',
	},

	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		description: 'Text to embed (use a short sentence or paragraph)',
		placeholder: 'e.g. The food was delicious and the waiter...',
		displayOptions: { show: { resource: ['text'], operation: ['embed'] } },
		default: '',
		typeOptions: { rows: 2 },
		routing: { send: { type: 'body', property: 'input' } },
	},
];

/* -------------------------------------------------------------------------- */
/*                               text:shared                                   */
/* -------------------------------------------------------------------------- */
const sharedOperations: INodeProperties[] = [
	// Simplify for completions (schema OpenAI-like: choices[].text)
	{
		displayName: 'Simplify',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: { show: { operation: ['complete'], resource: ['text'] } },
		description: 'Return a simplified version of the text completion',
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
						if (this.getNode().parameters.simplifyOutput === false) {
							return items;
						}
						return items.map((item) => ({
							json: {
								...item.json,
								text: (item.json.text as string)?.trim?.() ?? item.json.text,
							},
						}));
					},
				],
			},
		},
	},

	// Options for completions
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add option',
		description: 'Additional options',
		type: 'collection',
		default: {},
		displayOptions: { show: { operation: ['complete'], resource: ['text'] } },
		options: [
			{
				displayName: 'Echo Prompt',
				name: 'echo',
				type: 'boolean',
				default: false,
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
				routing: { send: { type: 'body', property: 'top_p' } },
			},
		],
	},

	// Simplify for embeddings (schema OpenAI-like: data[].embedding)
	{
		displayName: 'Simplify',
		name: 'simplifyEmbeddings',
		type: 'boolean',
		default: true,
		displayOptions: { show: { operation: ['embed'], resource: ['text'] } },
		description: 'Return a simplified array of embeddings instead of the raw response',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: { value: '={{ { "data": $response.body.data } }}' },
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: { property: 'data' },
					},
					async function (items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.simplifyEmbeddings === false) {
							return items;
						}
						return items.map((item) => ({
							json: {
								index: item.json.index,
								embedding: item.json.embedding,
							},
						}));
					},
				],
			},
		},
	},
];

export const textFields: INodeProperties[] = [
	/* -------------------------------- text:complete --------------------------- */
	...completeOperations,

	/* -------------------------------- text:embed ------------------------------ */
	...embedOperations,

	/* -------------------------------- text:ALL -------------------------------- */
	...sharedOperations,
];
