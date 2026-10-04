import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	CEREBRO_CREDENTIAL,
	cerebroAgentInfo,
	cerebroIngestTraces,
	cerebroListAgents,
} from './helpers/cerebro';
import { buildHitlOtlp, newSpanId, newTraceId } from './helpers/otlp';

/**
 * Sends the upstream agent's answer to Cerebro for human review as an OTLP trace,
 * then lets the workflow continue immediately. Cerebro's pipeline opens a review
 * case out of the trace; this node does not pause the execution (non-blocking).
 */
export class HitlStackAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HITLStackAgent',
		name: 'hitlStackAgent',
		icon: 'fa:user-check',
		iconColor: 'blue',
		group: ['transform'],
		version: 1,
		subtitle: 'Send for review',
		description: 'Send an agent answer to Cerebro for human review without pausing the workflow',
		defaults: {
			name: 'HITLStackAgent',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: CEREBRO_CREDENTIAL,
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'The item is sent to Cerebro as a trace and the workflow continues immediately. A review case is opened in Cerebro; this execution is not paused.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Agent Name or ID',
				name: 'agentId',
				type: 'options',
				default: '',
				required: true,
				typeOptions: { loadOptionsMethod: 'getAgents' },
				description:
					'Which Cerebro agent this review belongs to. The trace is sent to this agent so a review case can be grouped per agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Include Upstream Context',
				name: 'includeContext',
				type: 'boolean',
				default: true,
				description:
					'Whether to also send what the preceding nodes produced. A reviewer needs the question, not just the answer.',
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
					'How many nodes back to walk. 2 covers an AI Agent and whatever fed it. Raising this sends more of the workflow to Cerebro.',
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

		// One trace per invocation keeps the reviewer's case unambiguous. Callers
		// batch with a Loop Over Items node upstream.
		if (items.length !== 1) {
			throw new NodeOperationError(
				this.getNode(),
				`This node handles exactly one item at a time, but received ${items.length}`,
				{ description: 'Add a "Loop Over Items" node upstream to split the batch.' },
			);
		}

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
							// Only "pending" once Cerebro actually accepted the trace; a failed
							// delivery must not read as awaiting human input downstream.
							status: result.delivered && result.acceptedSpans !== 0 ? 'pending' : 'failed',
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
}

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

/**
 * Walks back from the HITL node and records what each ancestor produced, nearest
 * first. The reviewer needs the question alongside the answer being reviewed.
 */
function buildTrail(ctx: IExecuteFunctions, depth: number): IDataObject[] {
	const proxy = ctx.getWorkflowDataProxy(0);
	const parents = ctx.getParentNodes(ctx.getNode().name, {
		connectionType: NodeConnectionTypes.Main,
		depth,
	});

	return parents.map(({ name, type, disabled }) => {
		const entry: IDataObject = { node: name, type, executed: !disabled };
		try {
			// Resolve the ancestor item paired with THIS item, so a Loop Over Items
			// iteration carries its own question/context rather than the first item's.
			const paired = (proxy.$(name) as { item?: INodeExecutionData }).item;
			entry.output = paired?.json ?? null;
		} catch {
			// No paired-item lineage (e.g. a node that never ran on this branch, or a
			// node that doesn't propagate pairing) — fall back to the first item.
			try {
				const items = proxy.$items(name);
				entry.output = items[0]?.json ?? null;
			} catch {
				entry.executed = false;
				entry.output = null;
			}
		}
		return entry;
	});
}
