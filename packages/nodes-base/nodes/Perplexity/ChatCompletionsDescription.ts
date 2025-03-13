import type { INodeProperties } from 'n8n-workflow';

import { sendErrorPostReceive } from './GenericFunctions';

export const chatCompletionsOperations: INodeProperties[] = [
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
				name: 'Message a Model',
				value: 'complete',
				action: 'Message a model',
				description: 'Create one or more completions for a given text',
				routing: {
					request: {
						method: 'POST',
						url: '/chat/completions',
					},
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
		],
		default: 'complete',
	},
];

export const chatCompletionsFields: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getModels',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. sonar-deep-research',
			},
		],
		description: 'The model which will generate the completion',
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
			output: { postReceive: [sendErrorPostReceive] },
		},
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		required: true,
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: {
			message: [
				{
					role: 'user',
					content: '',
				},
			],
		},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['complete'],
			},
		},
		options: [
			{
				displayName: 'Message',
				name: 'message',
				values: [
					{
						displayName: 'Text',
						name: 'content',
						required: true,
						type: 'string',
						default: '',
						description: 'The content of the message to be sent',
						typeOptions: {
							rows: 2,
						},
					},
					{
						displayName: 'Role',
						name: 'role',
						required: true,
						type: 'options',
						options: [
							{ name: 'Assistant', value: 'assistant' },
							{ name: 'System', value: 'system' },
							{ name: 'User', value: 'user' },
						],
						default: 'user',
						description:
							"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'messages',
				value: '={{ $value.message }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['chat'],
				operation: ['complete'],
			},
		},
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description:
					"Values greater than 1.0 penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				routing: {
					send: {
						type: 'body',
						property: 'frequency_penalty',
					},
				},
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 0,
				description:
					'The maximum number of tokens to generate in the completion. The number of tokens requested plus the number of prompt tokens sent in messages must not exceed the context window token limit of model requested.',
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens',
					},
				},
			},
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				type: 'number',
				default: 0.2,
				description:
					'The amount of randomness in the response, valued between 0 inclusive and 2 exclusive. Higher values are more random, and lower values are more deterministic.',
				typeOptions: {
					minValue: 0,
					maxValue: 1.99,
				},
				routing: {
					send: {
						type: 'body',
						property: 'temperature',
					},
				},
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				default: 0,
				description:
					'The number of tokens to keep for highest Top K filtering, specified as an integer between 0 and 2048 inclusive. If set to 0, Top K filtering is disabled. We recommend either altering Top K or Top P, but not both.',
				typeOptions: {
					minValue: 0,
					maxValue: 2048,
				},
				routing: {
					send: {
						type: 'body',
						property: 'top_k',
					},
				},
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				default: 0.9,
				description:
					'The nucleus sampling threshold, valued between 0 and 1 inclusive. For each subsequent token, the model considers the results of the tokens with Top P probability mass. We recommend either altering Top K or Top P, but not both.',
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
				routing: {
					send: {
						type: 'body',
						property: 'top_p',
					},
				},
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				default: 0,
				description:
					"A value between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.",
				typeOptions: {
					minValue: -2.0,
					maxValue: 2.0,
				},
				routing: {
					send: {
						type: 'body',
						property: 'presence_penalty',
					},
				},
			},
			{
				displayName: 'Return Images',
				name: 'returnImages',
				type: 'boolean',
				default: false,
				description:
					'Whether or not a request to an online model should return images. Requires Perplexity API usage Tier-2.',
				routing: {
					send: {
						type: 'body',
						property: 'return_images',
					},
				},
			},
			{
				displayName: 'Return Related Questions',
				name: 'returnRelatedQuestions',
				type: 'boolean',
				default: false,
				description:
					'Whether or not a request to an online model should return related questions. Requires Perplexity API usage Tier-2.',
				routing: {
					send: {
						type: 'body',
						property: 'return_related_questions',
					},
				},
			},
			{
				displayName: 'Search Domain Filter',
				name: 'searchDomainFilter',
				type: 'string',
				default: '',
				description:
					'Limit the citations used by the online model to URLs from the specified domains. For blacklisting, add a <code>-</code> to the beginning of the domain string (e.g., <code>-domain1</code>). Currently limited to 3 domains. Requires Perplexity API usage Tier-3.',
				placeholder: 'e.g. domain1,domain2,-domain3',
				routing: {
					send: {
						type: 'body',
						property: 'search_domain_filter',
						value: '={{ $value.split(",").map(domain => domain.trim()) }}',
					},
				},
			},
			{
				displayName: 'Search Recency Filter',
				name: 'searchRecency',
				type: 'options',
				options: [
					{ name: 'Day', value: 'day' },
					{ name: 'Hour', value: 'hour' },
					{ name: 'Month', value: 'month' },
					{ name: 'Week', value: 'week' },
				],
				default: 'month',
				description: 'Returns search results within the specified time interval',
				routing: {
					send: {
						type: 'body',
						property: 'search_recency',
					},
				},
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplifyOutput',
		type: 'boolean',
		default: false,
		description: 'Whether to return only essential fields (ID, citations, message)',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value:
								'={{ { "id": $response.body?.id, "created": $response.body?.created, "citations": $response.body?.citations, "message": $response.body?.choices?.[0]?.message?.content } }}',
						},
					},
				],
			},
		},
	},
];
