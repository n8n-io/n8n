import { randomBytes } from 'node:crypto';

/*
 * Minimal OTLP/HTTP JSON builder for the HITL node's non-blocking (Cerebro) mode.
 * The node does not run the agent itself — it only sees the upstream answer and a
 * little context — so it emits a single `invoke_agent` span carrying the GenAI
 * semantic-convention attributes Cerebro's ingest expects. That one span is
 * enough for the pipeline to open a review case.
 *
 * Kept local to this node because nodes-base cannot import from @n8n/nodes-langchain.
 */

type AnyValue = { stringValue: string } | { intValue: string } | { boolValue: boolean };

interface KeyValue {
	key: string;
	value: AnyValue;
}

interface OtlpSpan {
	traceId: string;
	spanId: string;
	name: string;
	kind: number;
	startTimeUnixNano: string;
	endTimeUnixNano: string;
	attributes: KeyValue[];
	status: { code: number };
}

export interface ExportTraceServiceRequest {
	resourceSpans: Array<{
		resource: { attributes: KeyValue[] };
		scopeSpans: Array<{
			scope: { name: string; version: string };
			spans: OtlpSpan[];
		}>;
	}>;
}

const SPAN_KIND_INTERNAL = 1;
const STATUS_UNSET = 0;
const SCOPE = { name: 'n8n.hitl-stack-agent', version: '1.0.0' };

export const newTraceId = () => randomBytes(16).toString('hex');
export const newSpanId = () => randomBytes(8).toString('hex');

const nanos = (ms: number) => `${BigInt(Math.trunc(ms))}000000`;

function attr(key: string, value: unknown): KeyValue | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'boolean') return { key, value: { boolValue: value } };
	if (typeof value === 'number' && Number.isInteger(value)) {
		return { key, value: { intValue: String(value) } };
	}
	if (typeof value === 'string') return { key, value: { stringValue: value } };
	return { key, value: { stringValue: JSON.stringify(value) } };
}

export interface HitlTraceInput {
	traceId: string;
	spanId: string;
	agentId: string;
	agentName?: string;
	/** The question the agent answered, for the reviewer. */
	prompt?: string;
	/** The agent's answer that is being sent for review. */
	completion: string;
	/** Free-form labels copied onto the span as hitl.attr.* attributes. */
	extraAttributes?: Record<string, unknown>;
	startedAtMs?: number;
	endedAtMs?: number;
}

/** Builds a one-span OTLP request describing the agent output sent for review. */
export function buildHitlOtlp(input: HitlTraceInput): ExportTraceServiceRequest {
	const start = input.startedAtMs ?? Date.now();
	const end = input.endedAtMs ?? start;

	const spanAttrs: Array<KeyValue | undefined> = [
		attr('gen_ai.operation.name', 'invoke_agent'),
		attr('gen_ai.agent.id', input.agentId),
		attr('gen_ai.agent.name', input.agentName),
		attr('gen_ai.prompt', input.prompt),
		attr('gen_ai.completion', input.completion),
		// Marks the span as review-requested for rule engines honoring the client flag.
		attr('cerebro_review', true),
		attr('hitl.agent_id', input.agentId),
	];
	for (const [key, value] of Object.entries(input.extraAttributes ?? {})) {
		spanAttrs.push(attr(`hitl.attr.${key}`, value));
	}

	return {
		resourceSpans: [
			{
				resource: {
					attributes: [{ key: 'service.name', value: { stringValue: 'n8n-hitl-stack-agent' } }],
				},
				scopeSpans: [
					{
						scope: SCOPE,
						spans: [
							{
								traceId: input.traceId,
								spanId: input.spanId,
								name: 'invoke_agent',
								kind: SPAN_KIND_INTERNAL,
								startTimeUnixNano: nanos(start),
								endTimeUnixNano: nanos(end),
								attributes: spanAttrs.filter((kv): kv is KeyValue => kv !== undefined),
								status: { code: STATUS_UNSET },
							},
						],
					},
				],
			},
		],
	};
}
