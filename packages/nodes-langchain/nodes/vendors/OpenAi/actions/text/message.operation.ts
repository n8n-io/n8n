import type { Tool } from '@langchain/core/tools';
import _omit from 'lodash/omit';
import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { jsonParse, updateDisplayOptions } from 'n8n-workflow';

import { getConnectedTools } from '@utils/helpers';

import { MODELS_NOT_SUPPORT_FUNCTION_CALLS } from '../../helpers/constants';
import type { ChatCompletion } from '../../helpers/interfaces';
import { formatToOpenAIAssistantTool } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { modelRLC } from '../descriptions';

const properties: INodeProperties[] = [
	modelRLC('modelSearch'),
	{
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Message',
		default: { values: [{ content: '' }] },
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Prompt',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be send',
						default: '',
						placeholder: 'e.g. Hello, how can you help me?',
						typeOptions: {
							rows: 2,
						},
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						description:
							"Role in shaping the model's response, it tells the model how it should behave and interact with the user",
						options: [
							{
								name: 'User',
								value: 'user',
								description: 'Send a message as a user and get a response from the model',
							},
							{
								name: 'Assistant',
								value: 'assistant',
								description: 'Tell the model to adopt a specific tone or personality',
							},
							{
								name: 'System',
								value: 'system',
								description:
									"Usually used to set the model's behavior or context for the next user message",
							},
						],
						default: 'user',
					},
				],
			},
		],
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Output Content as JSON',
		name: 'jsonOutput',
		type: 'boolean',
		description:
			'Whether to attempt to return the response in JSON format. Compatible with GPT-4 Turbo and all GPT-3.5 Turbo models newer than gpt-3.5-turbo-1106.',
		default: false,
	},
	{
		displayName: 'Hide Tools',
		name: 'hideTools',
		type: 'hidden',
		default: 'hide',
		displayOptions: {
			show: {
				modelId: MODELS_NOT_SUPPORT_FUNCTION_CALLS,
				'@version': [{ _cnd: { gte: 1.2 } }],
			},
		},
	},
	{
		displayName: 'Connect your own custom n8n tools to this node on the canvas',
		name: 'noticeTools',
		type: 'notice',
		default: '',
		displayOptions: {
			hide: {
				hideTools: ['hide'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Frequency Penalty',
				name: 'frequency_penalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
				type: 'number',
			},
			{
				displayName: 'Maximum Number of Tokens',
				name: 'maxTokens',
				default: 16,
				description:
					'The maximum number of tokens to generate in the completion. Most models have a context length of 2048 tokens (except for the newest models, which support 32,768).',
				type: 'number',
				typeOptions: {
					maxValue: 32768,
				},
			},
			{
				displayName: 'Number of Completions',
				name: 'n',
				default: 1,
				description:
					'How many completions to generate for each prompt. Note: Because this parameter generates many completions, it can quickly consume your token quota. Use carefully and ensure that you have reasonable settings for max_tokens and stop.',
				type: 'number',
			},
			{
				displayName: 'Presence Penalty',
				name: 'presence_penalty',
				default: 0,
				typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
				description:
					"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
				type: 'number',
			},
			{
				displayName: 'Output Randomness (Temperature)',
				name: 'temperature',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
			{
				displayName: 'Output Randomness (Top P)',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'An alternative to sampling with temperature, controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
			{
				displayName: 'Max Tool Calls Iterations',
				name: 'maxToolsIterations',
				type: 'number',
				default: 15,
				description:
					'The maximum number of tool iteration cycles the LLM will run before stopping. A single iteration can contain multiple tool calls. Set to 0 for no limit.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.5 } }],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const nodeVersion = this.getNode().typeVersion;
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true });
	let messages = this.getNodeParameter('messages.values', i, []) as IDataObject[];
	const options = this.getNodeParameter('options', i, {});
	const jsonOutput = this.getNodeParameter('jsonOutput', i, false) as boolean;
	const maxToolsIterations =
		nodeVersion >= 1.5 ? (this.getNodeParameter('options.maxToolsIterations', i, 15) as number) : 0;

	const abortSignal = this.getExecutionCancelSignal();

	if (options.maxTokens !== undefined) {
		options.max_tokens = options.maxTokens;
		delete options.maxTokens;
	}

	if (options.topP !== undefined) {
		options.top_p = options.topP;
		delete options.topP;
	}

	let response_format;
	if (jsonOutput) {
		response_format = { type: 'json_object' };
		messages = [
			{
				role: 'system',
				content: 'You are a helpful assistant designed to output JSON.',
			},
			...messages,
		];
	}

	const hideTools = this.getNodeParameter('hideTools', i, '') as string;

	let tools;
	let externalTools: Tool[] = [];

	if (hideTools !== 'hide') {
		const enforceUniqueNames = nodeVersion > 1;
		externalTools = await getConnectedTools(this, enforceUniqueNames, false);
	}

	if (externalTools.length) {
		tools = externalTools.length ? externalTools?.map(formatToOpenAIAssistantTool) : undefined;
	}

	const body: IDataObject = {
		model,
		messages,
		tools,
		response_format,
		..._omit(options, ['maxToolsIterations']),
	};

	let response = (await apiRequest.call(this, 'POST', '/chat/completions', {
		body,
	})) as ChatCompletion;

	if (!response) return [];

	let currentIteration = 1;
	let toolCalls = response?.choices[0]?.message?.tool_calls;

	while (toolCalls?.length) {
		// Break the loop if the max iterations is reached or the execution is canceled
		if (
			abortSignal?.aborted ||
			(maxToolsIterations > 0 && currentIteration >= maxToolsIterations)
		) {
			break;
		}
		messages.push(response.choices[0].message);

		for (const toolCall of toolCalls) {
			const functionName = toolCall.function.name;
			const functionArgs = toolCall.function.arguments;

			let functionResponse;
			for (const tool of externalTools ?? []) {
				if (tool.name === functionName) {
					const parsedArgs: { input: string } = jsonParse(functionArgs);
					const functionInput = parsedArgs.input ?? parsedArgs ?? functionArgs;
					functionResponse = await tool.invoke(functionInput);
				}
			}

			if (typeof functionResponse === 'object') {
				functionResponse = JSON.stringify(functionResponse);
			}

			messages.push({
				tool_call_id: toolCall.id,
				role: 'tool',
				content: functionResponse,
			});
		}

		response = (await apiRequest.call(this, 'POST', '/chat/completions', {
			body,
		})) as ChatCompletion;

		toolCalls = response.choices[0].message.tool_calls;
		currentIteration += 1;
	}

	if (response_format) {
		response.choices = response.choices.map((choice) => {
			try {
				choice.message.content = JSON.parse(choice.message.content);
			} catch (error) {}
			return choice;
		});
	}

	const simplify = this.getNodeParameter('simplify', i) as boolean;

	const returnData: INodeExecutionData[] = [];

	if (simplify) {
		for (const entry of response.choices) {
			returnData.push({
				json: entry,
				pairedItem: { item: i },
			});
		}
	} else {
		returnData.push({ json: response, pairedItem: { item: i } });
	}

	return returnData;
}
