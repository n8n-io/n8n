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
import {
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
	isSafeObjectProperty,
	setSafeObjectProperty,
} from 'n8n-workflow';
import crypto from 'node:crypto';

import { generateSchemaFromExample } from './generateSchemaFromExample';

/** Description fields that are identical across versions. */
export const sharedVersionDescription: Pick<
	INodeTypeDescription,
	'defaults' | 'codex' | 'usableAsTool' | 'inputs' | 'outputs'
> = {
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

/** Character rules mirror `TrustedMetadataKeySchema` on the agent tool config side. */
const TRUSTED_VALUE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const TRUSTED_VALUE_MAX_LENGTH = 63;
const TRUSTED_VALUE_RESERVED_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validate one trusted value name against the same rules the agent tool
 * config applies to trusted metadata names. Checking here surfaces a mapping
 * mistake in the calling node instead of a silent no-op inside the agent.
 */
function validateTrustedValueName(ctx: IExecuteFunctions, name: string, itemIndex: number): void {
	if (!TRUSTED_VALUE_NAME_PATTERN.test(name) || name.length > TRUSTED_VALUE_MAX_LENGTH) {
		throw new NodeOperationError(
			ctx.getNode(),
			`"${name}" is not a valid trusted value name. Use up to 63 letters, numbers, underscores, or hyphens, and no spaces.`,
			{ itemIndex },
		);
	}
	if (TRUSTED_VALUE_RESERVED_NAMES.has(name)) {
		throw new NodeOperationError(
			ctx.getNode(),
			`"${name}" is a reserved name. Pick another name for this trusted value.`,
			{ itemIndex },
		);
	}
}

/**
 * Read the node's "Trusted Tool Values" mappings as a plain record keyed by
 * trusted metadata name. Each entry's value resolves expressions in this
 * node's context, so it can map the input message, `$json`, or data from
 * previous nodes. Expressions are runtime data resolved by the workflow
 * author's own mapping — the agent runtime still never lets the model see or
 * change them, and ignores any name the target tool does not declare.
 *
 * The record is built with a null prototype and guard-routed writes so an
 * unsafe name cannot pollute the object; undeclared names are dropped later
 * by the agent-side filter.
 */
export function getTrustedValues(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Record<string, unknown> | undefined {
	const raw = ctx.getNodeParameter('trustedValues', itemIndex, {}) as unknown;
	const entries = Array.isArray((raw as { values?: unknown })?.values)
		? (raw as { values: Array<{ name?: unknown; value?: unknown }> }).values
		: [];
	if (entries.length === 0) return undefined;

	const record: Record<string, unknown> = Object.create(null);
	const seen = new Set<string>();
	for (const entry of entries) {
		const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
		if (!name) {
			throw new NodeOperationError(
				ctx.getNode(),
				'A trusted value is missing its Name. Set a name for every entry in "Trusted Tool Values".',
				{ itemIndex },
			);
		}
		validateTrustedValueName(ctx, name, itemIndex);
		if (seen.has(name)) {
			throw new NodeOperationError(
				ctx.getNode(),
				`"${name}" is mapped more than once in "Trusted Tool Values". Keep one entry for each name.`,
				{ itemIndex },
			);
		}
		seen.add(name);
		// An empty value means "not provided": the agent tool falls back to its default.
		if (entry?.value === undefined || entry.value === null || entry.value === '') continue;
		if (isSafeObjectProperty(name)) {
			setSafeObjectProperty(record, name, entry.value);
		}
	}
	return Object.keys(record).length > 0 ? record : undefined;
}

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
		displayName: 'Agent Variables',
		name: 'trustedValues',
		placeholder: 'Add Variable',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			// The editor lists the variables the agent's tools read and renders one input for each.
			agentVariables: true,
		},
		default: {},
		description:
			"Values for the variables the agent's tools read. The model never sees or changes these values.",
		hint: 'Leave a variable empty to use the default set on the agent tool',
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Trusted metadata key name declared in the agent tool configuration',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description:
							'The value for this name. Use an expression to map the input message, item data, or output from previous nodes.',
					},
				],
			},
		],
	},
	{
		displayName: 'Advanced',
		name: 'advanced',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Enable Streaming',
				name: 'enableStreaming',
				type: 'boolean',
				default: true,
				description: "Whether to stream the agent's response as it generates text",
			},
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
			// Free-text override for nodes below v3.1; v3.1+ uses the Session settings below.
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				description:
					'Reuse an agent session to keep memory across runs. Leave empty to start a fresh session per execution.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 3.1 } }],
					},
				},
			},
			{
				displayName: 'Session',
				name: 'session',
				placeholder: 'Add session settings',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				default: {
					session: {},
				},
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 3.1 } }],
					},
				},
				options: [
					{
						displayName: 'Session',
						name: 'session',
						values: [
							{
								displayName: 'Session ID',
								name: 'sessionIdType',
								type: 'options',
								options: [
									{
										name: 'Connected Chat Trigger Node',
										value: 'fromInput',
										description:
											"Looks for an input field called 'sessionId' that is coming from a directly connected Chat Trigger",
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'Define below',
										value: 'customKey',
										description:
											'Use an expression to reference data in previous nodes or enter static text',
									},
								],
								default: 'fromInput',
							},
							{
								displayName: 'Session Key From Previous Node',
								name: 'sessionKey',
								type: 'string',
								default: '={{ $json.sessionId }}',
								disabledOptions: { show: { sessionIdType: ['fromInput'] } },
								displayOptions: {
									show: {
										sessionIdType: ['fromInput'],
									},
								},
							},
							{
								displayName: 'Key',
								name: 'sessionKey',
								type: 'string',
								default: '',
								description: 'The key to use as the agent session ID',
								displayOptions: {
									show: {
										sessionIdType: ['customKey'],
									},
								},
							},
						],
					},
				],
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

function validateSessionIdLength(ctx: IExecuteFunctions, sessionId: string, itemIndex: number) {
	if (sessionId.length > SESSION_ID_MAX_LENGTH) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Session ID must be at most ${SESSION_ID_MAX_LENGTH} characters (got ${sessionId.length})`,
			{ itemIndex },
		);
	}
}

/**
 * Resolve the session ID the way the Simple Memory node does: read `sessionId`
 * from the input item, falling back to the Chat Trigger node's output. Returns
 * `undefined` when neither resolves (e.g. the workflow has no Chat Trigger),
 * letting the engine fall back to a per-execution session.
 */
function getChatSessionId(ctx: IExecuteFunctions, itemIndex: number): string | undefined {
	let sessionId: unknown;

	try {
		sessionId = ctx.evaluateExpression('{{ $json.sessionId }}', itemIndex);
	} catch {}

	if (typeof sessionId !== 'string' || !sessionId.trim()) {
		try {
			const chatTrigger = ctx.getChatTrigger();
			if (chatTrigger && chatTrigger.disabled !== true) {
				const triggerName = chatTrigger.name.replace(/'/g, "\\'");
				sessionId = ctx.evaluateExpression(
					`{{ $('${triggerName}').first().json.sessionId }}`,
					itemIndex,
				);
			}
		} catch {}
	}

	if (typeof sessionId !== 'string') return undefined;

	const trimmed = sessionId.trim();
	if (!trimmed) return undefined;

	// Chat clients control this value, so an over-length id is not user-fixable;
	// hash it to fit the thread-key budget.
	if (trimmed.length > SESSION_ID_MAX_LENGTH) {
		return crypto.createHash('sha256').update(trimmed).digest('hex');
	}

	return trimmed;
}

/**
 * Session resolution for typeVersion >= 3.1, mirroring the Simple Memory node:
 * a custom key when "Define below" is selected, otherwise the connected Chat
 * Trigger's session. The Session settings default to `fromInput` even when the
 * option was never added, so a Chat Trigger works out of the box.
 */
function resolveSessionId(ctx: IExecuteFunctions, itemIndex: number): string | undefined {
	const session = ctx.getNodeParameter('advanced.session.session', itemIndex, {}) as {
		sessionIdType?: string;
		sessionKey?: unknown;
	};

	if (session.sessionIdType === 'customKey') {
		const key = typeof session.sessionKey === 'string' ? session.sessionKey.trim() : '';
		validateSessionIdLength(ctx, key, itemIndex);
		return key || undefined;
	}

	return getChatSessionId(ctx, itemIndex);
}

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
				enableStreaming?: boolean;
			};
			const allowOtherNodesData =
				agentSource === 'inline' ? false : (advanced.allowOtherNodesData ?? false);

			let sessionId: string | undefined;
			if (this.getNode().typeVersion >= 3.1) {
				sessionId = resolveSessionId(this, i);
			} else {
				const sessionIdOverride = advanced.sessionId?.trim();
				if (sessionIdOverride) validateSessionIdLength(this, sessionIdOverride, i);
				sessionId = sessionIdOverride || undefined;
			}

			if (!prompt.trim()) {
				throw new NodeOperationError(this.getNode(), 'Prompt cannot be empty', {
					itemIndex: i,
				});
			}

			const outputSchema = getStructuredOutputSchema(this, i);
			const trustedValues = getTrustedValues(this, i);

			const result = await this.executeAgent(
				{
					...source,
					sessionId,
					outputSchema,
					...(advanced.enableStreaming === false ? { enableStreaming: false } : {}),
					inputDataScope: runOnceForAll ? 'all' : 'item',
					exposeWorkflowData: allowOtherNodesData,
					...(trustedValues ? { trustedValues } : {}),
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
