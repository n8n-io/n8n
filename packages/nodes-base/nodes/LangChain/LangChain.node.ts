/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import get from 'lodash/get';

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import type { StructuredTool } from 'langchain/tools';
import { SerpAPI, WikipediaQueryRun } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';

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
		inputs: ['main', 'tool'],
		inputNames: ['', 'Tools'],
		outputs: ['main'],
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
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
		const tools: StructuredTool[] = [];

		const toolNodes = await this.getInputConnectionData(0, 0, 'tool');

		toolNodes.forEach((toolNode) => {
			if (!toolNode.parameters.enabled) {
				return;
			}
			if (toolNode.type === 'n8n-nodes-base.langChainToolCalculator') {
				tools.push(new Calculator());
			} else if (toolNode.type === 'n8n-nodes-base.langChainToolSerpApi') {
				const apiKey = get(toolNode, 'credentials.serpApi.apiKey');
				if (!apiKey) {
					throw new NodeOperationError(this.getNode(), 'SerpAPI API key missing');
				}
				tools.push(new SerpAPI(apiKey as string));
			} else if (toolNode.type === 'n8n-nodes-base.langChainToolWikipedia') {
				tools.push(new WikipediaQueryRun());
			}
		});

		const credentials = await this.getCredentials('openAiApi');

		const chat = new ChatOpenAI({
			openAIApiKey: credentials.apiKey as string,
			modelName: 'gpt-3.5-turbo',
			temperature: 0,
		});

		const executor = await initializeAgentExecutorWithOptions(tools, chat, {
			agentType: 'openai-functions',
			// verbose: true,
		});

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const text = this.getNodeParameter('text', itemIndex) as string;
			const response = await executor.run(text);
			returnData.push({ json: { response } });
		}
		return this.prepareOutputData(returnData);
	}
}
