import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { sendErrorPostReceive } from './GenericFunctions';

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
				name: 'Complete',
				value: 'complete',
				action: 'Create a Completion',
				description: 'Create one or more completions for a given text',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/completions',
					},
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
			{
				name: 'Edit',
				value: 'edit',
				action: 'Create an Edit',
				description: 'Create an edited version for a given text',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/edits',
					},
					output: { postReceive: [sendErrorPostReceive] },
				},
			},
			{
				name: 'Moderate',
				value: 'moderate',
				action: 'Create a Moderation',
				description: "Classify if a text violates OpenAI's content policy",
				routing: {
					request: {
						method: 'POST',
						url: '/v1/moderations',
					},
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
		description:
			'The model which will generate the completion. <a href="https://beta.openai.com/docs/models/overview">Learn more</a>.',
		displayOptions: {
			show: {
				operation: ['complete'],
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
								type: 'filter',
								properties: {
									pass: "={{ !$responseItem.id.startsWith('audio-') && !$responseItem.id.startsWith('gpt-') && !$responseItem.id.startsWith('whisper-') && !['cushman:2020-05-03', 'davinci-if:3.0.0', 'davinci-instruct-beta:2.0.0', 'if'].includes($responseItem.id) && !$responseItem.id.includes('-edit-') && !$responseItem.id.endsWith(':001') }}",
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
		description: 'The prompt to generate completion(s) for',
		placeholder: 'e.g. Say this is a test',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['complete'],
			},
		},
		default: '',
		typeOptions: {
			rows: 2,
		},
		routing: {
			send: {
				type: 'body',
				property: 'prompt',
			},
		},
	},
];

const editOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description:
			'The model which will generate the edited version. <a href="https://beta.openai.com/docs/models/overview">Learn more</a>.',
		displayOptions: {
			show: {
				operation: ['edit'],
				resource: ['text'],
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
		placeholder: 'e.g. What day of the wek is it?',
		description: 'The input text to be edited',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['edit'],
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
		placeholder: 'e.g. Fix the spelling mistakes',
		description: 'The instruction that tells the model how to edit the input text',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['edit'],
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

const moderateOperations: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		description:
			'The model which will classify the text. <a href="https://beta.openai.com/docs/models/overview">Learn more</a>.',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['moderate'],
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
		placeholder: 'e.g. My cat is adorable ❤️❤️',
		description: 'The input text to classify',
		displayOptions: {
			show: {
				resource: ['text'],
				operation: ['moderate'],
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
				operation: ['moderate'],
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
				operation: ['complete', 'edit'],
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
					async function (items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.simplifyOutput === false) {
							return items;
						}
						return items.map((item) => {
							return {
								json: {
									...item.json,
									text: (item.json.text as string).trim(),
								},
							};
						});
					},
				],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},

	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				operation: ['complete', 'edit'],
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
						'/operation': ['complete'],
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
				displayName: 'Frequency Penalty',
				name: 'frequency_penalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				type: 'number',
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
				default: 16,
				description:
					'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).',
				type: 'number',
				displayOptions: {
					show: {
						'/operation': ['complete'],
					},
				},
				typeOptions: {
					maxValue: 4096,
				},
				routing: {
					send: {
						type: 'body',
						property: 'max_tokens',
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
			{
				displayName: 'Presence Penalty',
				name: 'presence_penalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'presence_penalty',
					},
				},
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
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
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
				routing: {
					send: {
						type: 'body',
						property: 'top_p',
					},
				},
			},
		],
	},
];

export const textFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                               text:complete                        */
	/* -------------------------------------------------------------------------- */
	...completeOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:edit                             */
	/* -------------------------------------------------------------------------- */
	...editOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:moderate                       */
	/* -------------------------------------------------------------------------- */
	...moderateOperations,

	/* -------------------------------------------------------------------------- */
	/*                                text:ALL                                    */
	/* -------------------------------------------------------------------------- */
	...sharedOperations,
];
