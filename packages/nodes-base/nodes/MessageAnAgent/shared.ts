import type { JSONSchema7 } from 'json-schema';
import type {
	ExecuteAgentSource,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeTypeDescription,
	InlineAgentPayload,
} from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import crypto from 'node:crypto';

import { generateSchemaFromExample } from './generateSchemaFromExample';

/** Description fields that are identical across versions. */
export const sharedVersionDescription: Pick<
	INodeTypeDescription,
	'hidden' | 'defaults' | 'codex' | 'usableAsTool' | 'inputs' | 'outputs'
> = {
	hidden: true,
	defaults: {
		name: 'AI Agent V1',
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
};

/** The prompt input, identical across versions; rendered after the version-specific `agentId` picker. */
export const messageProperty: INodeProperties = {
	displayName: 'Message',
	name: 'message',
	type: 'string',
	default: '',
	required: true,
	description: 'The message to send to the agent',
	placeholder:
		'Process the refund for order {{ $json.order_id }} — confirm with the customer that it was approved.',
	typeOptions: {
		rows: 4,
	},
};

/**
 * Every property after the version-specific `agentId` picker and the shared
 * `message` input is identical across versions.
 */
const defaultOutputSchema = `{
  "type": "object",
  "properties": {
    "result": {
      "type": "string",
      "description": "The result of the task"
    }
  },
  "required": ["result"]
}`;

const defaultJsonSchemaExample = `{
  "result": "The result of the task"
}`;

export const commonProperties: INodeProperties[] = [
	{
		displayName: 'Require Specific Output Format',
		name: 'useStructuredOutput',
		type: 'boolean',
		default: false,
		description:
			'Whether to constrain the agent response to a JSON Schema you provide. The conforming object is returned on the "structuredOutput" field.',
	},
	{
		displayName: 'Schema Type',
		name: 'schemaType',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate From JSON Example',
				value: 'fromJson',
				description: 'Generate a schema from an example JSON object',
			},
			{
				name: 'Define Using JSON Schema',
				value: 'manual',
				description: 'Define the JSON schema manually',
			},
		],
		default: 'fromJson',
		description: 'How to specify the structured output schema',
		displayOptions: {
			show: {
				useStructuredOutput: [true],
				'@version': [{ _cnd: { gte: 3 } }],
			},
		},
	},
	{
		displayName: 'JSON Example',
		name: 'jsonSchemaExample',
		type: 'json',
		default: defaultJsonSchemaExample,
		description: 'Example JSON object used to generate the output schema',
		typeOptions: {
			rows: 10,
		},
		displayOptions: {
			show: {
				useStructuredOutput: [true],
				schemaType: ['fromJson'],
				'@version': [{ _cnd: { gte: 3 } }],
			},
		},
	},
	{
		displayName:
			"All properties will be required. To make them optional, use the 'JSON Schema' schema type instead",
		name: 'jsonSchemaExampleNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				useStructuredOutput: [true],
				schemaType: ['fromJson'],
				'@version': [{ _cnd: { gte: 3 } }],
			},
		},
	},
	// v1/v2: raw schema is the only option
	{
		displayName: 'Output Schema',
		name: 'outputSchema',
		type: 'json',
		default: defaultOutputSchema,
		description: 'The JSON Schema that the agent response must conform to',
		hint: 'Use <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format',
		typeOptions: {
			rows: 10,
		},
		displayOptions: {
			show: {
				useStructuredOutput: [true],
				'@version': [{ _cnd: { lt: 3 } }],
			},
		},
	},
	// v3+: raw schema is the advanced/manual option
	{
		displayName: 'Output Schema',
		name: 'outputSchema',
		type: 'json',
		default: defaultOutputSchema,
		description: 'The JSON Schema that the agent response must conform to',
		hint: 'Use <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format',
		typeOptions: {
			rows: 10,
		},
		displayOptions: {
			show: {
				useStructuredOutput: [true],
				schemaType: ['manual'],
				'@version': [{ _cnd: { gte: 3 } }],
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
				displayName: 'Invoke Agent',
				name: 'invokeMode',
				type: 'options',
				noDataExpression: true,
				default: 'allItems',
				description: 'Whether to call the agent once per input item or a single time for all items',
				displayOptions: {
					hide: {
						'/agentSource': ['inline'],
					},
				},
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
				displayOptions: {
					hide: {
						'/agentSource': ['inline'],
					},
				},
			},
		],
	},
];

function parseManualOutputSchema(
	ctx: IExecuteFunctions,
	itemIndex: number,
	rawSchema: unknown,
): JSONSchema7 {
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

/**
 * Read and parse the per-item structured-output JSON Schema. Returns `undefined`
 * when the toggle is off; throws a user-facing error when the toggle is on but
 * the schema is empty or not valid JSON. On typeVersion >= 3, supports inferring
 * the schema from a JSON example (`schemaType: fromJson`).
 */
export function getStructuredOutputSchema(
	ctx: IExecuteFunctions,
	itemIndex: number,
): JSONSchema7 | undefined {
	const useStructuredOutput = ctx.getNodeParameter(
		'useStructuredOutput',
		itemIndex,
		false,
	) as boolean;
	if (!useStructuredOutput) return undefined;

	const { typeVersion } = ctx.getNode();
	if (typeVersion >= 3) {
		const schemaType = ctx.getNodeParameter('schemaType', itemIndex, 'fromJson') as
			| 'fromJson'
			| 'manual';

		if (schemaType === 'fromJson') {
			const rawExample = ctx.getNodeParameter('jsonSchemaExample', itemIndex, '') as unknown;
			const exampleString =
				typeof rawExample === 'string' ? rawExample : (JSON.stringify(rawExample) ?? '');

			if (!exampleString.trim()) {
				throw new NodeOperationError(
					ctx.getNode(),
					'JSON example is empty. Provide an example object or turn off "Require Specific Output Format".',
					{ itemIndex },
				);
			}

			let schema: JSONSchema7;
			try {
				schema = generateSchemaFromExample(exampleString, true);
			} catch (error) {
				throw new NodeOperationError(
					ctx.getNode(),
					`JSON example is not valid JSON: ${(error as Error).message}`,
					{ itemIndex },
				);
			}

			if (schema.type !== 'object') {
				throw new NodeOperationError(
					ctx.getNode(),
					'JSON example must be a JSON object (e.g. { "result": "value" }), not an array or single value',
					{ itemIndex },
				);
			}

			return schema;
		}
	}

	const rawSchema = ctx.getNodeParameter('outputSchema', itemIndex, '') as unknown;
	return parseManualOutputSchema(ctx, itemIndex, rawSchema);
}

/**
 * Expressions can resolve to any JSON value (object, number, …); only string
 * values are usable prompts. Non-strings resolve to the "Prompt cannot be
 * empty" error instead of crashing `.trim()`.
 */
function asPromptString(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

/**
 * Read the agent to execute: an inline definition from the hidden `inlineAgent`
 * parameter, or the referenced agent id. The stored `agentId` is a
 * resource-locator value regardless of version (resourceLocator in v1,
 * agentSelector in v2), so reading `.value` works for both.
 */
function getAgentSource(ctx: IExecuteFunctions, itemIndex: number): ExecuteAgentSource {
	const agentSource = ctx.getNodeParameter('agentSource', itemIndex, 'referenced') as string;

	if (agentSource === 'inline') {
		// Read RAW: embedded node-tool parameters carry `$fromAI(...)` override
		// expressions that only the agent's tool executor may resolve. Resolving
		// them here (in the calling node's context, where `$fromAI` doesn't
		// exist) would blank those parameters — same reason saved agents store
		// their tool parameters unresolved.
		const raw = ctx.getNodeParameter(
			'inlineAgent',
			itemIndex,
			{},
			{
				rawExpressions: true,
			},
		) as unknown;
		const value =
			typeof raw === 'string'
				? jsonParse<unknown>(raw, {
						errorMessage: 'Inline agent configuration is not valid JSON',
					})
				: raw;
		if (
			typeof value !== 'object' ||
			value === null ||
			typeof (value as InlineAgentPayload).config !== 'object'
		) {
			throw new NodeOperationError(
				ctx.getNode(),
				'Inline agent is not configured. Open the node to set up the agent, or switch to a saved agent.',
				{ itemIndex },
			);
		}
		return { inlineAgent: value as InlineAgentPayload };
	}

	const agentIdRlc = ctx.getNodeParameter('agentId', itemIndex) as {
		mode: string;
		value: string;
	};
	return { agentId: agentIdRlc.value };
}

/**
 * The persisted thread key is `workflow:project-<projectId>:<sessionId>` and
 * thread id columns are varchar(128); a 36-char project id leaves 74 chars
 * for the caller's session id. Checked at execution time because the
 * parameter is typically an expression, invisible to edit-time validation.
 */
const SESSION_ID_MAX_LENGTH = 74;

/** Shared execution for every version. */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	// v2 renamed the primary output `response` → `text`
	const responseKey = this.getNode().typeVersion >= 2 ? 'text' : 'response';
	const executionId = this.getExecutionId() ?? crypto.randomUUID();
	const agentSource = this.getNodeParameter('agentSource', 0, 'referenced') as string;
	// Inline agents only support the defaults, including for workflows that retain
	// values saved before these controls were hidden.
	const invokeMode =
		agentSource === 'inline'
			? 'allItems'
			: (this.getNodeParameter('advanced.invokeMode', 0, 'allItems') as string);
	const runOnceForAll = invokeMode === 'allItems';
	const loopCount = runOnceForAll ? Math.min(1, items.length) : items.length;

	for (let i = 0; i < loopCount; i++) {
		try {
			const source = getAgentSource(this, i);
			const prompt = asPromptString(this.getNodeParameter('message', i, ''));

			const advanced = this.getNodeParameter('advanced', i, {}) as {
				sessionId?: string;
				allowOtherNodesData?: boolean;
			};
			const sessionIdOverride = advanced.sessionId?.trim();
			const allowOtherNodesData =
				agentSource === 'inline' ? false : (advanced.allowOtherNodesData ?? false);

			if (sessionIdOverride && sessionIdOverride.length > SESSION_ID_MAX_LENGTH) {
				throw new NodeOperationError(
					this.getNode(),
					`Session ID must be at most ${SESSION_ID_MAX_LENGTH} characters (got ${sessionIdOverride.length})`,
					{ itemIndex: i },
				);
			}

			if (!prompt.trim()) {
				throw new NodeOperationError(this.getNode(), 'Prompt cannot be empty', {
					itemIndex: i,
				});
			}

			const outputSchema = getStructuredOutputSchema(this, i);

			const result = await this.executeAgent(
				{
					...source,
					sessionId: sessionIdOverride || undefined,
					outputSchema,
					inputDataScope: runOnceForAll ? 'all' : 'item',
					exposeWorkflowData: allowOtherNodesData,
				},
				prompt,
				executionId,
				i,
			);

			returnData.push({
				json: {
					[responseKey]: result.response,
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
