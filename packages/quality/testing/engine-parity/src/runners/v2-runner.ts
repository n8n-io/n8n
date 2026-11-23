import type { WorkflowGraph } from '@n8n/engine';
import {
	toStepOutputs,
	toV1RunExecutionData,
	V1WorkflowConverter,
} from '@n8n/node-engine-compatibility';
import type {
	SubWorkflowResolveRequest,
	SubWorkflowResolveResult,
} from '@n8n/node-engine-compatibility';
import { EngineTestRuntime, ExecutionStalledError } from '@n8n/node-engine-compatibility/testing';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { IWorkflowBase } from 'n8n-workflow';
import { getChildNodes, isTriggerNodeType, NodeConnectionTypes } from 'n8n-workflow';

import type { ParityCase } from '../grammar/ir';
import { parityAdditionalData } from './additional-data';
import { parityNodeTypes } from './node-registry';
import type { EngineRunner, RawOutcome } from './runner';
import { CASE_TIMEOUT_MS } from './runner';
import { toExecutionData } from './v1-runner';

const POSTGRES_IMAGE = process.env.TEST_IMAGE_POSTGRES ?? 'postgres:18-alpine';

function errorMessage(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * The edges of the workflow that the converted graph does not have. Engine v1
 * keeps every edge between nodes that the fired trigger reaches.
 */
export function findDroppedEdges(
	workflow: IWorkflowBase,
	graph: WorkflowGraph,
	firedTrigger: string,
): string[] {
	if (workflow.nodes.some((node) => node.disabled === true)) return [];
	const reachable = new Set([
		firedTrigger,
		...getChildNodes(workflow.connections, firedTrigger, NodeConnectionTypes.Main, -1),
	]);
	const idsByName = new Map(workflow.nodes.map((node) => [node.name, node.id]));
	const kept = new Set(
		graph.edges.map((edge) => `${edge.from}|${edge.outputIndex}|${edge.to}|${edge.inputIndex}`),
	);
	const dropped = new Set<string>();
	for (const [source, byType] of Object.entries(workflow.connections)) {
		if (!reachable.has(source)) continue;
		(byType.main ?? []).forEach((slot, out) => {
			for (const target of slot ?? []) {
				const key = `${idsByName.get(source)}|${out}|${idsByName.get(target.node)}|${target.index}`;
				if (!kept.has(key)) dropped.add(`${source}[${out}] -> ${target.node}[${target.index}]`);
			}
		});
	}
	return [...dropped];
}

/**
 * Runs a case on engine v2 in this process: one Postgres container and one
 * engine runtime for each worker, reused for all cases. The workflow goes
 * through `V1WorkflowConverter`, and the result comes back through
 * `toV1RunExecutionData`, so both engines report in one format.
 */
export class V2Runner implements EngineRunner {
	readonly name = 'v2';

	private readonly converter = new V1WorkflowConverter();

	private readonly engine = new EngineTestRuntime({
		nodeTypes: parityNodeTypes,
		additionalDataFactory: async ({ executionId }) =>
			await Promise.resolve(parityAdditionalData(executionId)),
		logger: quietLogger,
	});

	private container?: StartedPostgreSqlContainer;

	async start(): Promise<void> {
		this.container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
		await this.engine.start(this.container.getConnectionUri());
	}

	async stop(): Promise<void> {
		await this.engine.stop();
		await this.container?.stop();
	}

	async run(parityCase: ParityCase): Promise<RawOutcome> {
		let graph: WorkflowGraph;
		try {
			graph = this.converter.convert(parityCase.workflow, parityCase.ir.firedTrigger);
		} catch (error) {
			return { kind: 'refused', reason: `converter: ${errorMessage(error)}` };
		}
		const dropped = findDroppedEdges(parityCase.workflow, graph, parityCase.ir.firedTrigger);
		const notes = dropped.map((edge) => `The converter dropped the edge ${edge}`);

		const start = await this.engine.startExecution({
			workflowId: parityCase.workflow.id,
			graph,
			triggerOutputs: toStepOutputs([toExecutionData(parityCase.ir.triggerItems)]),
			mode: 'production',
			callerContext: { hostMode: 'trigger' },
			resolveSubWorkflow: async (request) =>
				await Promise.resolve(this.resolveSubWorkflow(parityCase, request)),
		});
		if (!start.started) {
			return { kind: 'refused', reason: `engine: ${start.status} ${JSON.stringify(start.body)}` };
		}

		try {
			await this.engine.waitForFinish(start.executionId, CASE_TIMEOUT_MS);
		} catch (error) {
			if (!(error instanceof ExecutionStalledError)) throw error;
			// The runtime runs one execution at a time. The next case must not start beside this one.
			await this.engine.cancelExecution(start.executionId);
			return {
				kind: 'timeout',
				stalledAt: error.steps.map(({ nodeId, iteration, status, error: stepError }) =>
					[nodeId, iteration, status, stepError?.message].filter((part) => part !== undefined),
				),
			};
		}

		const snapshot = await this.engine.getExecution(start.executionId);
		const { resultData } = toV1RunExecutionData(graph, snapshot.steps ?? []);
		return {
			kind: 'ran',
			status: snapshot.status,
			runData: resultData.runData,
			lastNodeExecuted: resultData.lastNodeExecuted,
			error: resultData.error,
			...(notes.length > 0 ? { notes } : {}),
		};
	}

	/** What the control plane answers for a sub-workflow from the database. */
	private resolveSubWorkflow(
		parityCase: ParityCase,
		request: SubWorkflowResolveRequest,
	): SubWorkflowResolveResult {
		const subWorkflow = parityCase.subWorkflows[request.workflowId];
		if (!subWorkflow) throw new Error(`The case has no sub-workflow "${request.workflowId}"`);
		const trigger = subWorkflow.nodes.find((node) => isTriggerNodeType(node.type));
		return {
			workflowId: request.workflowId,
			graph: this.converter.convert(subWorkflow, trigger?.name),
			workflow: { id: request.workflowId, name: subWorkflow.name },
			triggerOutputs: toStepOutputs([request.items]),
		};
	}
}

const quietLogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};
