import type { JSONSchema7 } from 'json-schema';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import crypto from 'node:crypto';

/**
 * Read and parse the per-item structured-output JSON Schema. Returns `undefined`
 * when the toggle is off; throws a user-facing error when the toggle is on but
 * the schema is empty or not valid JSON.
 */
function getStructuredOutputSchema(
	ctx: IExecuteFunctions,
	itemIndex: number,
): JSONSchema7 | undefined {
	const useStructuredOutput = ctx.getNodeParameter(
		'useStructuredOutput',
		itemIndex,
		false,
	) as boolean;
	if (!useStructuredOutput) return undefined;

	const rawSchema = ctx.getNodeParameter('outputSchema', itemIndex, '') as unknown;

	let parsed: JSONSchema7;

	if (typeof rawSchema === 'object') {
		parsed = rawSchema as JSONSchema7;
	} else if (typeof rawSchema === 'string') {
		if (!rawSchema.trim()) {
			throw new NodeOperationError(
				ctx.getNode(),
				'Output schema is empty. Provide a JSON Schema or turn off "Require Specific Output Format".',
				{ itemIndex },
			);
		}

		try {
			parsed = jsonParse<JSONSchema7>(rawSchema);
		} catch (error) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Output schema is not valid JSON: ${(error as Error).message}`,
				{ itemIndex },
			);
		}
	} else {
		throw new NodeOperationError(
			ctx.getNode(),
			'Output schema is not valid JSON. Provide a JSON Schema or turn off "Require Specific Output Format".',
			{ itemIndex },
		);
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new NodeOperationError(ctx.getNode(), 'Output schema must be a JSON Schema object', {
			itemIndex,
		});
	}

	return parsed;
}

export class MessageAnAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Message an n8n Agent',
		name: 'messageAnAgent',
		icon: 'node:ai-agent',
		group: ['transform'],
		version: 1,
		hidden: true,
		description: 'Send a message to a n8n agent',
		defaults: {
			name: 'Message an Agent',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Root Nodes'],
			},
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'Invoke Agent',
				name: 'invokeMode',
				type: 'options',
				noDataExpression: true,
				default: 'allItems',
				description: 'Whether to call the agent once per input item or a single time for all items',
				options: [
					{
						name: 'Once for All Items',
						value: 'allItems',
						description: 'Call the agent a single time; it can read all input items',
					},
					{
						name: 'Once Per Item',
						value: 'perItem',
						description: 'Call the agent separately for each input item',
					},
				],
			},
			{
				displayName: 'Require Specific Output Format',
				name: 'useStructuredOutput',
				type: 'boolean',
				default: false,
				description:
					'Whether to constrain the agent response to a JSON Schema you provide. The conforming object is returned on the "structuredOutput" field.',
			},
			{
				displayName: 'Output Schema',
				name: 'outputSchema',
				type: 'json',
				default: `{
  "type": "object",
  "properties": {
    "result": {
      "type": "string",
      "description": "The result of the task"
    }
  },
  "required": ["result"]
}`,
				description: 'The JSON Schema that the agent response must conform to',
				hint: 'Use <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						useStructuredOutput: [true],
					},
				},
			},
			{
				displayName:
					'Structured output is enforced by the model provider. For best results across providers, mark every property as required. Some providers reject optional fields or advanced keywords (e.g. OpenAI and xAI), and a few do not support structured output at all (e.g. DeepSeek).',
				name: 'structuredOutputNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						useStructuredOutput: [true],
					},
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
					{
						displayName: "Allow Agent to Access Other Nodes' Data",
						name: 'allowOtherNodesData',
						type: 'boolean',
						default: false,
						description:
							"Whether to give the agent a tool to read other workflow nodes' execution data, beyond its own input",
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
		const invokeMode = this.getNodeParameter('invokeMode', 0, 'allItems') as string;
		const runOnceForAll = invokeMode === 'allItems';
		const loopCount = runOnceForAll ? Math.min(1, items.length) : items.length;

		for (let i = 0; i < loopCount; i++) {
			try {
				const agentIdRlc = this.getNodeParameter('agentId', i) as {
					mode: string;
					value: string;
				};
				const agentId = agentIdRlc.value;
				const message = this.getNodeParameter('message', i) as string;
				const advanced = this.getNodeParameter('advanced', i, {}) as {
					sessionId?: string;
					allowOtherNodesData?: boolean;
				};
				const sessionIdOverride = advanced.sessionId?.trim();
				const allowOtherNodesData = advanced.allowOtherNodesData ?? false;

				if (!message.trim()) {
					throw new NodeOperationError(this.getNode(), 'Message cannot be empty', {
						itemIndex: i,
					});
				}

				const outputSchema = getStructuredOutputSchema(this, i);

				const result = await this.executeAgent(
					{
						agentId,
						sessionId: sessionIdOverride || undefined,
						outputSchema,
						inputDataScope: runOnceForAll ? 'all' : 'item',
						exposeWorkflowData: allowOtherNodesData,
					},
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
