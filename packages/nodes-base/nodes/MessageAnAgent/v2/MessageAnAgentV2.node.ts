import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { commonProperties, execute, messageProperty, sharedVersionDescription } from '../shared';

export class MessageAnAgentV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(thisBaseDescription: INodeTypeBaseDescription) {
		this.description = {
			...thisBaseDescription,
			...sharedVersionDescription,
			version: 2,
			properties: [
				{
					displayName: 'Agent',
					name: 'agentId',
					type: 'agentSelector',
					default: { __rl: true, mode: 'list', value: '' },
					required: true,
					description: 'The agent to send the message to',
				},
				messageProperty,
				...commonProperties,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await execute.call(this);
	}
}
