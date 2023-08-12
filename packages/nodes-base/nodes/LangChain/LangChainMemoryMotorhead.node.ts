/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class LangChainMemoryMotorhead implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Motorhead',
		name: 'langChainMemoryMotorhead',
		icon: 'fa:file-export',
		group: ['transform'],
		version: 1,
		description: 'Motorhead Memory',
		defaults: {
			name: 'LangChain - Motorhead',
			color: '#303030',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['memory'],
		outputNames: ['Memory'],
		credentials: [
			{
				name: 'motorheadApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Memory Key',
				name: 'memoryKey',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
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
