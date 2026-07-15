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
					displayName: 'Agent Source',
					name: 'agentSource',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Saved Agent',
							value: 'referenced',
							description: 'Reference an agent from this project, managed in the Agent Builder',
						},
						{
							name: 'Inline Agent',
							value: 'inline',
							description:
								'Configure the agent directly in this node; its settings are saved with the workflow',
						},
					],
					// Existing workflows have no stored agentSource, so the default must
					// keep them on the referenced path.
					default: 'referenced',
				},
				{
					displayName: 'Agent',
					name: 'agentId',
					type: 'agentSelector',
					default: { __rl: true, mode: 'list', value: '' },
					required: true,
					description: 'The agent to send the message to',
					displayOptions: {
						show: {
							agentSource: ['referenced'],
						},
					},
				},
				// The NDV edits this through a dedicated inline-agent editor. Kept
				// hidden with no displayOptions: displayed-parameter filtering would
				// otherwise strip the config whenever the node is saved in
				// referenced mode, making mode toggling destructive.
				{
					displayName: 'Inline Agent',
					name: 'inlineAgent',
					type: 'hidden',
					default: {},
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
