import type {
	INodeProperties,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { apiRequest } from '../../transport';
import type { ChatCompletion, ExternalApiCallOptions } from '../../helpers/interfaces';

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
		description:
			'A list of tools(functions) the model may call to receive additional data or to do some processing',
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
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. get_current_weather',
					},
					{
						displayName: 'Description',
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
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Function',
								value: 'function',
								description: 'Provide a javaScript function to be called',
							},
							{
								name: 'External API Call',
								value: 'api',
								description: 'Call an external API to get the response',
							},
						],
						default: 'function',
					},
					{
						displayName: 'Code (JavaScript)',
						name: 'jsCode',
						type: 'string',
						description:
							"Specify function that accepts a single parameter of type object with properties matching tool's Parameters",
						typeOptions: {
							editor: 'codeNodeEditor',
							editorLanguage: 'javaScript',
						},
						default:
							'(parameters) => {\n  const {location, unit} = parameters;\n  if (location === \'tokyo\') {\n    return { location: "Tokyo", temperature: "10", unit };\n  } else {\n    return { location, temperature: "unknown" };\n  }\n}',
						noDataExpression: true,
						displayOptions: {
							show: {
								type: ['function'],
							},
						},
					},
					{
						displayName: 'Method',
						name: 'method',
						type: 'options',
						options: [
							{
								name: 'GET',
								value: 'GET',
							},
							{
								name: 'POST',
								value: 'POST',
							},
							{
								name: 'PUT',
								value: 'PUT',
							},
							{
								name: 'PATCH',
								value: 'PATCH',
							},
						],
						default: 'GET',
						displayOptions: {
							show: {
								type: ['api'],
							},
						},
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://wikipedia.org/api',
						validateType: 'url',
						displayOptions: {
							show: {
								type: ['api'],
							},
						},
					},
					{
						displayName: 'Send Parameters in...',
						name: 'sendParametersIn',
						type: 'options',
						options: [
							{
								name: 'Body',
								value: 'body',
							},
							{
								name: 'Query String',
								value: 'qs',
							},
							{
								name: 'Path',
								value: 'path',
							},
						],
						default: 'qs',
						displayOptions: {
							show: {
								type: ['api'],
							},
						},
					},
					{
						displayName: 'Path',
						name: 'path',
						type: 'string',
						default: '',
						placeholder: 'e.g. /weather/{latitude}/{longitude}',
						hint: "Use {parameter_name} to indicate where the parameter's value should be inserted",
						displayOptions: {
							show: {
								type: ['api'],
								sendParametersIn: ['path'],
							},
						},
					},
					{
						displayName: 'Additional Request Options',
						name: 'requestOptions',
						type: 'json',
						typeOptions: {
							rows: 5,
						},
						default: '{\n  "headers": {},\n  "qs": {},\n  "body": {}\n}',
						description:
							'Use this if you need to set additional options for the request like authorization headers',
						validateType: 'object',
						displayOptions: {
							show: {
								type: ['api'],
							},
						},
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
	const toolFunctions: { [key: string]: string | ExternalApiCallOptions } = {};
	if (toolsValues.length) {
		tools = [];

		for (const tool of toolsValues) {
			toolFunctions[tool.name as string] = tool.jsCode as string;

			if (tool.type === 'api') {
				toolFunctions[tool.name as string] = {
					callExternalApi: true,
					url: tool.url as string,
					path: tool.path as string,
					method: tool.method as string,
					requestOptions:
						typeof tool.requestOptions === 'string'
							? jsonParse(tool.requestOptions)
							: (tool.requestOptions as IDataObject),
					sendParametersIn: tool.sendParametersIn as string,
				};
			} else {
				toolFunctions[tool.name as string] = tool.jsCode as string;
			}

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
			const functionArgs = toolCall.function.arguments;

			const functionToCall = toolFunctions[functionName];

			let functionResponse;
			if (typeof functionToCall === 'object' && functionToCall.callExternalApi) {
				const { url, method, sendParametersIn, path } = functionToCall;
				const requestOptions =
					typeof functionToCall.requestOptions === 'string'
						? jsonParse<IDataObject>(functionToCall.requestOptions)
						: functionToCall.requestOptions;

				const externalRequestOptions: IHttpRequestOptions = {
					url,
					method: method as 'GET' | 'POST',
				};

				if (requestOptions.headers && Object.keys(requestOptions.headers).length) {
					externalRequestOptions.headers = requestOptions.headers as IDataObject;
				}

				if (requestOptions.qs && Object.keys(requestOptions.qs).length) {
					externalRequestOptions.qs = requestOptions.qs as IDataObject;
				}

				if (requestOptions.body && Object.keys(requestOptions.body).length) {
					externalRequestOptions.body = requestOptions.body as IDataObject;
				}

				if (sendParametersIn === 'body') {
					externalRequestOptions.body = {
						...((externalRequestOptions.body as IDataObject) || {}),
						...jsonParse<IDataObject>(functionArgs),
					};
				} else if (sendParametersIn === 'qs') {
					externalRequestOptions.qs = {
						...((externalRequestOptions.qs as IDataObject) || {}),
						...jsonParse<IDataObject>(functionArgs),
					};
				} else {
					const functionArgsObject = jsonParse<IDataObject>(functionArgs);
					let parsedPath = path;

					for (const [key, value] of Object.entries(functionArgsObject)) {
						parsedPath = parsedPath.replace(`{${key}}`, String(value));
					}

					externalRequestOptions.url = `${url}${encodeURI(parsedPath)}`;
				}

				functionResponse = await this.helpers.httpRequest(externalRequestOptions);
			} else {
				functionResponse = this.evaluateExpression(`{{(${functionToCall})(${functionArgs})}}`, i);
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
