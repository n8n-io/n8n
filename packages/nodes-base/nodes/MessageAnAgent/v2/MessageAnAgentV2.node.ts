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
				// Set by the node-creator agent picker ('referenced' | 'inline'), not
				// editable in the NDV. Kept hidden with no displayOptions so saves
				// never strip it. Existing workflows have no stored agentSource, so
				// the default must keep them on the referenced path.
				{
					displayName: 'Agent Source',
					name: 'agentSource',
					type: 'hidden',
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
