/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import get from 'lodash/get';

import { ChatOpenAI } from 'langchain/chat_models/openai';
import type { Tool } from 'langchain/tools';
import { SerpAPI, WikipediaQueryRun } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';
import type { BaseChatMemory } from 'langchain/memory';
import { MotorheadMemory } from 'langchain/memory';
import type { InitializeAgentExecutorOptions } from 'langchain/agents';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { HuggingFaceInference } from 'langchain/llms/hf';
import type { BaseLanguageModel } from 'langchain/dist/base_language';

export class LangChain implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain',
		name: 'langChain',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'LangChain',
		defaults: {
			name: 'LangChain',
			color: '#404040',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'tool', 'memory', 'languageModel'],
		inputNames: ['', 'Tools', 'Memory', 'Language Model'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const tools: Tool[] = [];
		let memory: BaseChatMemory | undefined;
		let model: BaseLanguageModel | undefined;

		const languageModelNodes = await this.getInputConnectionData(0, 0, 'languageModel');
		languageModelNodes.forEach((connectedNode) => {
			if (!connectedNode.parameters.enabled) {
				return;
			}

			if (connectedNode.type === 'n8n-nodes-base.langChainLMOpenAi') {
				const apiKey = get(connectedNode, 'credentials.openAiApi.apiKey', '');

				const modelName = get(connectedNode, 'parameters.model', '') as string;
				const temperature = get(connectedNode, 'parameters.temperature', 0) as number;

				model = new ChatOpenAI({
					openAIApiKey: apiKey as string,
					modelName,
					temperature,
				});
			} else if (connectedNode.type === 'n8n-nodes-base.langChainLMOpenHuggingFaceInference') {
				const apiKey = get(connectedNode, 'credentials.huggingFaceApi.apiKey', '');

				const modelName = get(connectedNode, 'parameters.model', '') as string;
				const temperature = get(connectedNode, 'parameters.temperature', 0) as number;

				model = new HuggingFaceInference({
					model: modelName,
					apiKey,
					temperature,
					maxTokens: 100,
				});
			}
		});

		if (!model) {
			throw new NodeOperationError(this.getNode(), 'No language model defined');
		}

		const memoryNodes = await this.getInputConnectionData(0, 0, 'memory');
		memoryNodes.forEach((connectedNode) => {
			if (!connectedNode.parameters.enabled) {
				return;
			}

			if (connectedNode.type === 'n8n-nodes-base.langChainMemoryMotorhead') {
				const url = get(connectedNode, 'credentials.motorheadApi.host', '') as string;
				const clientId = get(connectedNode, 'credentials.motorheadApi.clientId');
				const apiKey = get(connectedNode, 'credentials.motorheadApi.apiKey');

				const memoryKey = get(connectedNode, 'parameters.memoryKey', '') as string;
				const sessionId = get(connectedNode, 'parameters.sessionId', '') as string;

				// TODO: Does not work yet
				memory = new MotorheadMemory({
					memoryKey,
					sessionId,
					url,
					clientId,
					apiKey,
				});
			}
		});

		const toolNodes = await this.getInputConnectionData(0, 0, 'tool');

		// TODO: Should later find way to move that logic to the nodes again
		//       but at the same time keep maxium flexibility
		toolNodes.forEach((connectedNode) => {
			if (!connectedNode.parameters.enabled) {
				return;
			}

			if (connectedNode.type === 'n8n-nodes-base.langChainToolCalculator') {
				tools.push(new Calculator());
			} else if (connectedNode.type === 'n8n-nodes-base.langChainToolSerpApi') {
				const apiKey = get(connectedNode, 'credentials.serpApi.apiKey');
				if (!apiKey) {
					throw new NodeOperationError(this.getNode(), 'SerpAPI API key missing');
				}
				tools.push(new SerpAPI(apiKey as string));
			} else if (connectedNode.type === 'n8n-nodes-base.langChainToolWikipedia') {
				tools.push(new WikipediaQueryRun());
			}
		});

		const options: InitializeAgentExecutorOptions = {
			agentType: 'chat-conversational-react-description',
			verbose: true,
			memory,
		};

		const executor = await initializeAgentExecutorWithOptions(tools, model, options);

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const text = this.getNodeParameter('text', itemIndex) as string;

			const response = await executor.call({
				input: text,
			});

			returnData.push({ json: { response } });
		}
		return this.prepareOutputData(returnData);
	}
}
