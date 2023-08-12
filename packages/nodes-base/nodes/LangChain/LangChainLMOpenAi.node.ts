/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class LangChainLMOpenAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - OpenAI',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'langChainLMOpenAi',
		icon: 'file:openAi.svg',
		group: ['transform'],
		version: 1,
		description: 'Language Model OpenAI',
		defaults: {
			name: 'LangChain - OpenAI',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['languageModel'],
		outputNames: ['Language Model'],
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'GTP 3.5 Turbo',
						value: 'gpt-3.5-turbo',
					},
					{
						name: 'DaVinci-003',
						value: 'text-davinci-003',
					},
				],
				default: 'gpt-3.5-turbo',
			},
			{
				displayName: 'Sampling Temperature',
				name: 'temperature',
				default: 0.7,
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
				displayName: 'Enabled',
				name: 'enabled',
				type: 'boolean',
				default: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [];
	}
}
