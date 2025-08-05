import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		default: 'r1-1776',
		required: true,
		options: [
			{ name: 'R1-1776', value: 'r1-1776' },
			{ name: 'Sonar', value: 'sonar' },
			{ name: 'Sonar Deep Research', value: 'sonar-deep-research' },
			{ name: 'Sonar Pro', value: 'sonar-pro' },
			{ name: 'Sonar Reasoning', value: 'sonar-reasoning' },
			{ name: 'Sonar Reasoning Pro', value: 'sonar-reasoning-pro' },
		],
		description: 'The model which will generate the completion',
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
	},
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		description:
			'Any optional system messages must be sent first, followed by alternating user and assistant messages',
		required: true,
		typeOptions: {
			multipleValues: true,
			sortable: true,
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
		options: [
			{
				displayName: 'Message',
				name: 'message',
				values: [
					{
						displayName: 'Text',
						name: 'content',
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
							{
								name: 'Assistant',
								value: 'assistant',
								description:
									'Tell the model to adopt a specific tone or personality. Must alternate with user messages.',
							},
							{
								name: 'System',
								value: 'system',
								description:
									'Set the models behavior or context. Must come before user and assistant messages.',
							},
							{
								name: 'User',
								value: 'user',
								description: 'Send a message as a user and get a response from the model',
							},
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
		displayName: 'Simplify Output',
		name: 'simplify',
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
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
				default: 1,
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
					{
						name: 'Day',
						value: 'day',
					},
					{
						name: 'Hour',
						value: 'hour',
					},
					{
						name: 'Month',
						value: 'month',
					},
					{
						name: 'Week',
						value: 'week',
					},
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
];

const displayOptions = {
	show: {
		resource: ['chat'],
		operation: ['complete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
