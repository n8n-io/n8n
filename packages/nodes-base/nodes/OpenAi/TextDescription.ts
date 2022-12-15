import { INodeProperties } from 'n8n-workflow';

export const textOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['text'],
			},
		},
		options: [
			{
				name: 'Create Completion',
				value: 'createCompletion',
				action: 'Create a Completion',
				description: 'Create a predicted completions for a given text',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/completions',
					},
				},
			},
			{
				name: 'Create Edit',
				value: 'createEdit',
				action: 'Create an Edit',
				description: 'Create an edited version for a given text',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/edits',
					},
				},
			},
			{
				name: 'Create Moderation',
				value: 'createModeration',
				action: 'Create a Moderation',
				description: "Classify if a text violates OpenAI's content policy",
				routing: {
					request: {
						method: 'POST',
						url: '/v1/moderations',
					},
				},
			},
		],
		default: 'createCompletion',
	},
];

const createCompletionOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description:
			'Information about models can be found <a href="https://beta.openai.com/docs/models/overview">here</a>',
		displayOptions: {
			show: {
				operation: ['createCompletion'],
				resource: ['text'],
			},
		},
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/v1/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased-id
									name: '={{$responseItem.id}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: 'text-davinci-003',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		placeholder: 'Say this is a test',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['createCompletion'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'prompt',
			},
		},
	},
];

const createEditOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description:
			'Information about models can be found <a href="https://beta.openai.com/docs/models/overview">here</a>',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['createEdit'],
			},
		},
		options: [
			{
				name: 'code-davinci-edit-001',
				value: 'code-davinci-edit-001',
			},
			{
				name: 'text-davinci-edit-001',
				value: 'text-davinci-edit-001',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: 'text-davinci-edit-001',
	},
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		placeholder: 'What day of the wek is it?',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['createEdit'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'input',
			},
		},
	},
	{
		displayName: 'Instruction',
		name: 'instruction',
		type: 'string',
		placeholder: 'Fix the spelling mistakes',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['createEdit'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'instruction',
			},
		},
	},
];

const createModerationOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description:
			'Information about models can be found <a href="https://beta.openai.com/docs/models/overview">here</a>',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['createModeration'],
			},
		},
		options: [
			{
				name: 'text-moderation-stable',
				value: 'text-moderation-stable',
			},
			{
				name: 'text-moderation-latest',
				value: 'text-moderation-latest',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'model',
			},
		},
		default: 'text-moderation-latest',
	},
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		placeholder: 'I want to kill them.',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['createModeration'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'input',
			},
		},
	},

	{
		displayName: 'Simplify',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['createModeration'],
				resource: ['text'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: {
							value: '={{ { "data": $response.body.results } }}',
						},
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: {
							property: 'data',
						},
					},
				],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const sharedOperations: INodeProperties[] = [
	{
		displayName: 'Simplify',
		name: 'simplifyOutput',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['createCompletion', 'createEdit'],
				resource: ['text'],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{$value}}',
						properties: {
							value: '={{ { "data": $response.body.choices } }}',
						},
					},
					{
						type: 'rootProperty',
						enabled: '={{$value}}',
						properties: {
							property: 'data',
						},
					},
				],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},

	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				operation: ['createCompletion', 'createEdit'],
				resource: ['text'],
			},
		},
		options: [
			{
				displayName: 'Echo Prompt',
				name: 'echo',
				type: 'boolean',
				description: 'Whether the prompt should be echo back in addition to the completion',
				default: false,
				displayOptions: {
					show: {
						'/operation': ['createCompletion'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'echo',
					},
				},
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				default: 16,
				description: 'The maximum number of tokens to generate in the completion',
				type: 'number',
				displayOptions: {
					show: {
						'/operation': ['createCompletion'],
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens',
					},
				},
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 1,
				description:
					'What <a href="https://towardsdatascience.com/how-to-sample-from-language-models-682bceb97277">sampling temperature</a> to use. Higher values means the model will take more risks. Try 0.9 for more creative applications, and 0 (argmax sampling) for ones with a well-defined answer. We generally recommend altering this or top_p but not both.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'temperature',
					},
				},
			},
			{
				displayName: 'Top P',
				name: 'topP',
				default: 1,
				description:
					'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'top_p',
					},
				},
			},
			{
				displayName: 'Number of Completions',
				name: 'n',
				default: 1,
				description:
					'How many completions to generate for each prompt. Note: Because this parameter generates many completions, it can quickly consume your token quota. Use carefully and ensure that you have reasonable settings for max_tokens and stop.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'n',
					},
				},
			},
		],
	},
];

export const textFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               text:createCompletion                        */
	/* -------------------------------------------------------------------------- */
	...createCompletionOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:createEdit                             */
	/* -------------------------------------------------------------------------- */
	...createEditOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:createModeration                       */
	/* -------------------------------------------------------------------------- */
	...createModerationOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:ALL                                    */
	/* -------------------------------------------------------------------------- */
	...sharedOperations,
];
