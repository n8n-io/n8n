import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeConnectionType,
} from 'n8n-workflow';
import { defaultConfig } from './helper';

export class SdrAgentRules implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SDR Agent Rules',
		name: 'sdrAgentRules',
		group: ['transform'],
		version: 1,
		description: 'Apply retry rules and attempt logic for SDR Agent.',
		defaults: {
			name: 'SDR Agent Rules',
			color: '#FF5733',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Retry After (Days)',
				name: 'retryAfterDays',
				type: 'number',
				default: defaultConfig.retryAfterDays,
				description: 'Number of days before retrying a failed call.',
			},
			{
				displayName: 'Max Attempts',
				name: 'maxAttempts',
				type: 'number',
				default: defaultConfig.maxAttempts,
				description: 'Maximum number of call attempts before stopping.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const [inputData] = this.getInputData();
		const { sdrAgentId, segmentId } = inputData.json;

		if (!sdrAgentId || !segmentId) {
			throw new Error('SDR Agent ID and Segment ID are required.');
		}

		const retryAfterDays = this.getNodeParameter(
			'retryAfterDays',
			defaultConfig.retryAfterDays,
		) as number;
		const maxAttempts = this.getNodeParameter('maxAttempts', defaultConfig.maxAttempts) as number;

		return [[{ json: { sdrAgentId, segmentId, retryAfterDays, maxAttempts } }]];
	}
}
