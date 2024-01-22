import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';
import type { ChatCompletion } from '../../helpers/interfaces';

const properties: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'modelId',
		type: 'resourceLocator',
		default: { mode: 'list', value: 'gpt-3.5-turbo-1106', cachedResultName: 'GPT-3.5-TURBO-1106' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'modelCompletionSearch',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. gpt-4',
			},
		],
	},
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
						displayName: 'Text',
						name: 'content',
						type: 'string',
						description: 'The content of the message to be send',
						default: '',
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
									"Usualy used to set the model's behavior or context for the next user message",
							},
						],
						default: 'user',
					},
				],
			},
		],
	},
	{
		displayName: 'Tools',
		name: 'tools',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Tool',
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Function Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. get_current_weather',
					},
					{
						displayName: 'Function Description',
						name: 'description',
						type: 'string',
						default: '',
						placeholder: 'e.g. Get the current weather in a given location',
					},
					{
						displayName: 'Parameters (Properties)',
						name: 'properties',
						type: 'json',
						typeOptions: {
							rows: 5,
						},
						description:
							'The parameters that the function accepts, refer to <a href="https://platform.openai.com/docs/guides/function-calling?lang=node.js" target="_blank">the documentation</a> for more information',
						default:
							'{\n  "location": {\n    "type": "string",\n     "description": "The city or state"\n},\n  "unit": { \n    "type": "string", \n    "enum": ["celsius", "fahrenheit"] \n  }\n}',
						validateType: 'object',
					},
					{
						displayName: 'Function Code (JavaScript)',
						name: 'jsCode',
						type: 'string',
						description:
							"Specify function that accepts a single parameter of type object with properties matching tool's Parameters",
						typeOptions: {
							editor: 'codeNodeEditor',
							editorLanguage: 'javaScript',
						},
						default:
							'//Specify function body that matches tool\'s Parameters\nfunction getCurrentWeather(location, unit = "fahrenheit") {\n  if (location === \'tokyo\') {\n    return { location: "Tokyo", temperature: "10", unit: "celsius" };\n  } else {\n    return { location, temperature: "unknown" };\n  }\n}\n\n//Return your function\nreturn getCurrentWeather;',
						noDataExpression: true,
					},
				],
			},
		],
	},
	{
		displayName: 'Simplify',
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
			'Whether to attempt to return the response in JSON format, supported by gpt-3.5-turbo-1106 and gpt-4-1106-preview',
		default: false,
		displayOptions: {
			show: {
				modelId: ['gpt-3.5-turbo-1106', 'gpt-4-1106-preview'],
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
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
				type: 'number',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
				description:
					'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
				type: 'number',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: ['messageModel'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const model = this.getNodeParameter('modelId', i, '', { extractValue: true });
	let messages = this.getNodeParameter('messages.values', i, []) as IDataObject[];
	const toolsValues = this.getNodeParameter('tools.values', i, []) as IDataObject[];
	const options = this.getNodeParameter('options', i, {});
	const jsonOutput = this.getNodeParameter('jsonOutput', i, false) as boolean;

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

	let tools;
	const toolFunctions: IDataObject = {};
	if (toolsValues.length) {
		tools = [];
		for (const tool of toolsValues) {
			toolFunctions[tool.name as string] = tool.jsCode as string;

			const toolProperties: IDataObject =
				typeof tool.properties === 'string'
					? jsonParse(tool.properties)
					: (tool.properties as IDataObject);

			tools.push({
				type: 'function',
				function: {
					name: tool.name,
					description: tool.description,
					parameters: {
						type: 'object',
						properties: toolProperties,
						required: Object.keys(toolProperties),
					},
				},
			});
		}
	}

	const body: IDataObject = {
		model,
		messages,
		tools,
		response_format,
		...options,
	};

	let response = (await apiRequest.call(this, 'POST', '/chat/completions', {
		body,
	})) as ChatCompletion;

	let toolCalls = response.choices[0].message.tool_calls;

	while (toolCalls && toolCalls.length) {
		messages.push(response.choices[0].message);

		for (const toolCall of toolCalls) {
			const functionName = toolCall.function.name;
			const functionToCall = toolFunctions[functionName];
			const functionArgs = toolCall.function.arguments;

			let functionResponse = this.evaluateExpression(`{{(${functionToCall})(${functionArgs})}}`, i);

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
