import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { commonProperties, execute, messageProperty, sharedVersionDescription } from '../shared';

export class MessageAnAgentV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(thisBaseDescription: INodeTypeBaseDescription) {
		this.description = {
			...thisBaseDescription,
			...sharedVersionDescription,
			version: 1,
			properties: [
				{
					displayName: 'Agent',
					name: 'agentId',
					type: 'resourceLocator',
					default: { mode: 'list', value: '' },
					required: true,
					description: 'The agent to send the message to',
					modes: [
						{
							displayName: 'From List',
							name: 'list',
							type: 'list',
							typeOptions: {
								searchListMethod: 'listAgents',
								searchable: true,
							},
						},
						{
							displayName: 'By ID',
							name: 'id',
							type: 'string',
							placeholder: 'e.g. abc123',
							validation: [
								{
									type: 'regex',
									properties: {
										regex: '.+',
										errorMessage: 'Agent ID cannot be empty',
									},
								},
							],
						},
					],
				},
				messageProperty,
				...commonProperties,
			],
		};
	}

	methods = {
		listSearch: {
			async listAgents(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<{ results: Array<{ name: string; value: string }> }> {
				try {
					if (!this.listAgents) {
						return { results: [] };
					}
					const agents = await this.listAgents();

					let results = agents.map((agent) => ({
						name: agent.name,
						value: agent.id,
					}));

					if (filter) {
						const lowerFilter = filter.toLowerCase();
						results = results.filter((agent) => agent.name.toLowerCase().includes(lowerFilter));
					}

					return { results };
				} catch {
					return { results: [] };
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await execute.call(this);
	}
}
