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
		inputs: ['main', 'test'],
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
		// const llm = new OpenAI();
		// const result = await llm.predict(
		// 	'What would be a good company name for a company that makes colorful socks?',
		// );
		// const credentials = await this.getCredentials('openAiApi');
		// const model = new OpenAI({
		// 	// openAIApiKey: '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',
		// 	openAIApiKey: credentials.apiKey as string,
		// });
		// const memory = new BufferMemory();
		// const chain = new ConversationChain({ llm: model, memory });
		// // const text = this.getNodeParameter('text', 0) as string;
		// const asdf = await chain.call({ input: 'hello my name is Jan' });
		// console.log('asdf', asdf);
		// const response = await chain.call({ input: 'What did I say my name was?' });
		// return this.prepareOutputData([
		// 	{ json: { history: memory.chatHistory.getMessages(), response } },
		// ]);
		// // TODO: Add support for memory and tools in first step
		// console.log('result', result);

		const tools: StructuredTool[] = [];

		const toolNodes = await this.getInputConnectionData(0, 0, 'test');

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
