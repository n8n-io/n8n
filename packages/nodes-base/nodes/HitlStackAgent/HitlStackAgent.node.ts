import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	SEND_AND_WAIT_OPERATION,
	WAIT_INDEFINITELY,
	isSafeObjectProperty,
	setSafeObjectProperty,
	type IDataObject,
	type IExecuteFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

import {
	CEREBRO_CREDENTIAL,
	cerebroAgentInfo,
	cerebroIngestTraces,
	cerebroListAgents,
} from './helpers/cerebro';
import { buildHitlOtlp, newSpanId, newTraceId } from './helpers/otlp';

type HeaderParameter = { name: string; value: string };

/**
 * Registers work with an external service, then parks the execution until that
 * service calls back. The wait is persisted by n8n, so it survives restarts and
 * can span days — which a held-open HTTP request cannot.
 */
export class HitlStackAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HITLStackAgent',
		name: 'hitlStackAgent',
		icon: 'fa:user-check',
		iconColor: 'blue',
		group: ['transform'],
		version: 1,
		subtitle: '={{"register: " + $parameter["url"]}}',
		description: 'Register an item with an external service and wait for its callback',
		defaults: {
			name: 'HITLStackAgent',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				// Only the non-blocking (Cerebro) mode authenticates; blocking mode
				// posts to a plain URL with optional headers instead.
				name: CEREBRO_CREDENTIAL,
				required: true,
				displayOptions: { show: { reviewMode: ['cerebro'] } },
			},
		],
		// `restartWebhook` marks these as execution-resumers rather than triggers.
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				responseData: '',
				path: '={{ $nodeId }}',
				restartWebhook: true,
				isFullPath: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				responseData: '',
				path: '={{ $nodeId }}',
				restartWebhook: true,
				isFullPath: true,
			},
		],
		properties: [
			{
				displayName: 'Review Mode',
				name: 'reviewMode',
				type: 'options',
				noDataExpression: true,
				default: 'cerebro',
				options: [
					{
						name: 'Review in Background (Non-Blocking)',
						value: 'cerebro',
						description:
							'The item is sent to Cerebro for review as a trace and the workflow continues immediately. A review case is opened in Cerebro; the execution is not paused.',
					},
					{
						name: 'Wait for Review (Blocking)',
						value: 'blocking',
						description:
							'The item is registered with an external service and the execution pauses until that service calls the resume URL back. Survives restarts.',
					},
				],
			},
			// n8n's waiting-webhook handler only HMAC-validates a resume URL when the
			// node declares this operation; otherwise it expects a plain resumeToken
			// and rejects a signed URL with 401.
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				default: SEND_AND_WAIT_OPERATION,
			},
			{
				displayName: 'Agent Name or ID',
				name: 'agentId',
				type: 'options',
				default: '',
				displayOptions: { show: { reviewMode: ['cerebro'] } },
				typeOptions: { loadOptionsMethod: 'getAgents' },
				description:
					'Which Cerebro agent this review belongs to. The trace is sent to this agent so a review case can be grouped per agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName:
					'The item is sent to Cerebro as a trace and the workflow continues immediately. A review case is opened in Cerebro; this execution is not paused.',
				name: 'noticeCerebro',
				type: 'notice',
				default: '',
				displayOptions: { show: { reviewMode: ['cerebro'] } },
			},
			{
				displayName:
					'This node registers the item with your service, then waits for that service to call the resume URL back. The execution is paused and persisted meanwhile.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: { show: { reviewMode: ['blocking'] } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: 'http://localhost:3100/hitl',
				required: true,
				placeholder: 'http://localhost:3100/hitl',
				description: 'Registration endpoint. Must acknowledge quickly, then call back when done.',
				displayOptions: { show: { reviewMode: ['blocking'] } },
			},
			{
				displayName: 'Send Headers',
				name: 'sendHeaders',
				type: 'boolean',
				default: false,
				displayOptions: { show: { reviewMode: ['blocking'] } },
			},
			{
				displayName: 'Headers',
				name: 'headerParameters',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Header',
				displayOptions: {
					show: { reviewMode: ['blocking'], sendHeaders: [true] },
				},
				options: [
					{
						name: 'parameters',
						displayName: 'Parameters',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Include Upstream Context',
				name: 'includeContext',
				type: 'boolean',
				default: true,
				description:
					'Whether to also send what the preceding nodes produced. A reviewer needs the question, not just the answer — and a revise round needs the original input to compose from.',
			},
			{
				displayName: 'Context Depth',
				name: 'contextDepth',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 2,
				displayOptions: {
					show: { includeContext: [true] },
				},
				description:
					'How many nodes back to walk. 2 covers an AI Agent and whatever fed it. Raising this grows the payload and sends more of the workflow to the endpoint.',
			},
			{
				displayName: 'Limit Wait Time',
				name: 'limitWaitTime',
				type: 'boolean',
				default: false,
				description:
					'Whether to give up after a set time. By default the execution waits indefinitely.',
				displayOptions: { show: { reviewMode: ['blocking'] } },
			},
			{
				displayName: 'Max Wait (Minutes)',
				name: 'maxWaitMinutes',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 60,
				displayOptions: {
					show: { reviewMode: ['blocking'], limitWaitTime: [true] },
				},
				description: 'Resume anyway once this many minutes have passed without a callback',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Registration Timeout',
						name: 'timeout',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 10000,
						description:
							'Time in ms to wait for the registration acknowledgement. Unrelated to how long the service may then take.',
					},
					{
						displayName: 'Ignore SSL Issues',
						name: 'allowUnauthorizedCerts',
						type: 'boolean',
						default: false,
						description: 'Whether to connect even if SSL certificate validation is not possible',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const agents = await cerebroListAgents(this);
				if (agents.length === 0) {
					return [
						{
							name: 'No Agents Found for This API Key',
							value: '',
							description: 'Create an agent in Cerebro, then reload this list',
						},
					];
				}
				return agents.map((a) => ({
					name: a.agent_name,
					value: a.agent_id,
					description: a.status ? `ID ${a.agent_id} — ${a.status}` : `ID ${a.agent_id}`,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		// putExecutionToWait pauses the whole execution, so a per-item loop is not
		// expressible. Callers batch with a Loop Over Items node upstream.
		if (items.length !== 1) {
			throw new NodeOperationError(
				this.getNode(),
				`This node handles exactly one item at a time, but received ${items.length}`,
				{ description: 'Add a "Loop Over Items" node upstream to split the batch.' },
			);
		}

		const reviewMode = this.getNodeParameter('reviewMode', 0, 'cerebro') as string;

		// Non-blocking (Cerebro) mode: export the item as a trace so Cerebro opens a
		// review case, then continue immediately. The execution is not paused.
		if (reviewMode === 'cerebro') {
			const agentId = (this.getNodeParameter('agentId', 0, '') as string) || undefined;
			if (!agentId) {
				throw new NodeOperationError(
					this.getNode(),
					'Select an Agent: the review trace is sent to Cerebro, which needs an agent id.',
					{ description: 'Choose an agent in the "Agent Name or ID" field.' },
				);
			}

			const trail = (this.getNodeParameter('includeContext', 0, true) as boolean)
				? buildTrail(this, this.getNodeParameter('contextDepth', 0, 2) as number)
				: [];
			const { agentName } = await cerebroAgentInfo(this, agentId);
			const completion = extractCompletion(items[0].json);
			const prompt = extractPrompt(trail);

			const traceId = newTraceId();
			const payload = buildHitlOtlp({
				traceId,
				spanId: newSpanId(),
				agentId,
				agentName,
				prompt,
				completion,
			});
			const result = await cerebroIngestTraces(this, agentId, payload);

			return [
				[
					{
						json: {
							...items[0].json,
							review: {
								mode: 'cerebro',
								status: 'pending',
								agentId,
								traceId,
								delivered: result.delivered,
								acceptedSpans: result.acceptedSpans,
								...(result.error ? { error: result.error } : {}),
							},
						},
						pairedItem: { item: 0 },
					},
				],
			];
		}

		const url = this.getNodeParameter('url', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as {
			timeout?: number;
			allowUnauthorizedCerts?: boolean;
		};

		const workflow = this.getWorkflow();
		const node = this.getNode();

		const body: IDataObject = {
			executionId: this.getExecutionId(),
			workflowId: workflow.id ?? 'unknown',
			// A reviewer managing several workflows needs a name, not just an id
			workflowName: workflow.name ?? '',
			nodeName: node.name,
			// Distinguishes two HITL nodes in the same workflow
			nodeId: node.id,
			registeredAt: new Date().toISOString(),
			resumeUrl: this.getSignedResumeUrl(),
			data: items[0].json,
		};

		if (this.getNodeParameter('includeContext', 0, true) as boolean) {
			body.trail = buildTrail(this, this.getNodeParameter('contextDepth', 0, 2) as number);
		}

		const requestOptions: IHttpRequestOptions = {
			url,
			method: 'POST',
			json: true,
			timeout: options.timeout ?? 10000,
			skipSslCertificateValidation: options.allowUnauthorizedCerts ?? false,
			body,
		};

		if (this.getNodeParameter('sendHeaders', 0, false) as boolean) {
			const { parameters = [] } = this.getNodeParameter('headerParameters', 0, {}) as {
				parameters?: HeaderParameter[];
			};

			// Header names come from the workflow author, so they are untrusted keys
			const headers: IDataObject = {};
			for (const { name, value } of parameters) {
				if (name && isSafeObjectProperty(name)) {
					setSafeObjectProperty(headers, name, value);
				}
			}
			requestOptions.headers = headers;
		}

		// Register first. Parking the execution after a failed registration would
		// strand it forever, since nothing would exist to call the resume URL.
		try {
			await this.helpers.httpRequest(requestOptions);
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				itemIndex: 0,
				message: 'Could not register with the service',
				description: 'The execution was not paused, so no callback is expected.',
			});
		}

		let waitTill = WAIT_INDEFINITELY;
		if (this.getNodeParameter('limitWaitTime', 0, false) as boolean) {
			const maxWaitMinutes = this.getNodeParameter('maxWaitMinutes', 0, 60) as number;
			waitTill = new Date(Date.now() + maxWaitMinutes * 60 * 1000);
		}

		await this.putExecutionToWait(waitTill);

		// Returned only if the wait times out; a callback replaces this via webhook()
		return [items];
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();

		return {
			webhookResponse: { received: true },
			workflowData: [[{ json: body }]],
		};
	}
}

/**
 * Walks back from the HITL node and records what each ancestor produced, nearest
 * first. The reviewer needs the question alongside the answer, and a revise round
 * needs the agent's original input to compose the next prompt from.
 */
/** The agent answer being sent for review — the upstream `output`, else the whole item. */
function extractCompletion(json: IDataObject): string {
	const out = json.output;
	if (typeof out === 'string') return out;
	if (out !== undefined && out !== null) return JSON.stringify(out);
	return JSON.stringify(json);
}

/** The question the reviewer should see — the chat input from the upstream trail. */
function extractPrompt(trail: IDataObject[]): string | undefined {
	for (const entry of trail) {
		const output = entry.output as IDataObject | null | undefined;
		if (!output) continue;
		const candidate = output.chatInput ?? output.input ?? output.query ?? output.question;
		if (typeof candidate === 'string' && candidate.trim()) return candidate;
	}
	return undefined;
}

function buildTrail(ctx: IExecuteFunctions, depth: number): IDataObject[] {
	const proxy = ctx.getWorkflowDataProxy(0);
	const parents = ctx.getParentNodes(ctx.getNode().name, {
		connectionType: NodeConnectionTypes.Main,
		depth,
	});

	return parents.map(({ name, type, disabled }) => {
		const entry: IDataObject = { node: name, type, executed: !disabled };
		try {
			// A node that never ran on this branch throws rather than returning []
			const items = proxy.$items(name);
			entry.output = items[0]?.json ?? null;
		} catch {
			entry.executed = false;
			entry.output = null;
		}
		return entry;
	});
}
