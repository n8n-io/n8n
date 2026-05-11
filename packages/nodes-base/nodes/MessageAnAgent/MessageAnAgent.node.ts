import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import crypto from 'node:crypto';

export class MessageAnAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Message an Agent',
		name: 'messageAnAgent',
		icon: 'node:ai-agent',
		group: ['transform'],
		version: 1,
		hidden: true,
		description: 'Send a message to an SDK agent and receive its response',
		defaults: {
			name: 'Message an Agent',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Only published agents are listed below. Publish an agent before referencing it from a workflow.',
				name: 'publishedAgentNotice',
				type: 'notice',
				default: '',
			},
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
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				description: 'The message to send to the agent',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Advanced',
				name: 'advanced',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Session ID',
						name: 'sessionId',
						type: 'string',
						default: '',
						description:
							'Reuse an agent session to keep memory across runs. Leave empty to start a fresh session per execution.',
					},
				],
			},
		],
	};

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
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const executionId = this.getExecutionId() ?? crypto.randomUUID();

		for (let i = 0; i < items.length; i++) {
			try {
				const agentIdRlc = this.getNodeParameter('agentId', i) as {
					mode: string;
					value: string;
				};
				const agentId = agentIdRlc.value;
				const message = this.getNodeParameter('message', i) as string;
				const advanced = this.getNodeParameter('advanced', i, {}) as { sessionId?: string };
				const sessionIdOverride = advanced.sessionId?.trim();

				if (!message.trim()) {
					throw new NodeOperationError(this.getNode(), 'Message cannot be empty', {
						itemIndex: i,
					});
				}

				const result = await this.executeAgent(
					{ agentId, sessionId: sessionIdOverride || undefined },
					message,
					executionId,
					i,
				);

				returnData.push({
					json: {
						response: result.response,
						structuredOutput: (result.structuredOutput ?? null) as IDataObject | null,
						usage: result.usage as unknown as IDataObject,
						toolCalls: result.toolCalls as unknown as IDataObject[],
						finishReason: result.finishReason,
						session: result.session as unknown as IDataObject,
					},
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
