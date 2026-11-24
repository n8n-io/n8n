import { UnexpectedError } from '@n8n/errors';

import {
	NodeConnectionTypes,
	type INode,
	type INodeExecutionData,
	type IRun,
	type ITaskData,
} from './interfaces';
import { getConnectionTypes, getNodeOutputs } from './node-helpers';
import type { Workflow } from './workflow';

/** The presence of this policy enables a single output of declared main branches. */
export interface SubWorkflowOutputPolicy {
	lastRunOnly: boolean;
}

export function getSubWorkflowOutputPolicy(
	nodes: INode[],
	callerReturnsLastRunOnly: boolean,
): SubWorkflowOutputPolicy | undefined {
	const trigger = nodes.find((node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger');
	if (!trigger || trigger.typeVersion < 1.3) return undefined;
	return { lastRunOnly: callerReturnsLastRunOnly };
}

/** Return runs of the last executed node in execution order. */
export function getLastExecutedNodeRuns(inputData: IRun): ITaskData[] {
	const { runData, lastNodeExecuted } = inputData.data.resultData;
	if (lastNodeExecuted === undefined) return [];
	return [...(runData[lastNodeExecuted] ?? [])].sort(
		(a, b) => (a.executionIndex ?? 0) - (b.executionIndex ?? 0),
	);
}

/** Return the final run, with the existing manual pin substitution. */
export function getLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	const { runData, lastNodeExecuted } = inputData.data.resultData;
	const pinData = inputData.data.resultData.pinData ?? {};
	if (lastNodeExecuted === undefined || !runData[lastNodeExecuted]?.length) return undefined;
	const lastNodeRunData = runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];
	let lastNodePinData = pinData[lastNodeExecuted];
	if (lastNodePinData && inputData.mode === 'manual') {
		if (!Array.isArray(lastNodePinData)) lastNodePinData = [lastNodePinData];
		return {
			startTime: 0,
			executionIndex: 0,
			executionTime: 0,
			data: {
				main: [lastNodePinData.map((item, index) => ({ json: item, pairedItem: { item: index } }))],
			},
			source: lastNodeRunData.source,
		};
	}
	return lastNodeRunData;
}

/** Collect only connectable outputs. Recorded branches can also contain discarded items. */
export async function collectSubWorkflowOutput(
	run: IRun,
	workflow: Workflow,
	policy: SubWorkflowOutputPolicy,
): Promise<Array<INodeExecutionData[] | null>> {
	const lastRun = getLastExecutedNodeData(run);
	if (!lastRun?.data?.main) return [null];
	const { lastNodeExecuted, pinData } = run.data.resultData;
	const node = lastNodeExecuted ? workflow.getNode(lastNodeExecuted) : null;
	if (!node) {
		throw new UnexpectedError('The last executed node is missing from the saved workflow.');
	}
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	const usePinData = run.mode === 'manual' && pinData?.[node.name] !== undefined;
	const branches =
		policy.lastRunOnly || usePinData
			? lastRun.data.main
			: mergeRunsPerBranch(getLastExecutedNodeRuns(run));
	// Dynamic outputs were resolved during execution. Their expressions can depend on input data.
	const outputCount =
		typeof nodeType.description.outputs === 'string'
			? branches.length
			: getConnectionTypes(getNodeOutputs(workflow, node, nodeType.description)).filter(
					(type) => type === NodeConnectionTypes.Main,
				).length;
	return [branches.slice(0, outputCount).flatMap((branch) => branch ?? [])];
}

/**
 * For each output branch, concatenate items from every run in the order they were produced.
 */
export function mergeRunsPerBranch(runs: ITaskData[]): Array<INodeExecutionData[] | null> {
	const branchCount = runs.reduce((max, run) => Math.max(max, run.data?.main?.length ?? 0), 0);
	return Array.from({ length: branchCount }, (_, branch) =>
		runs.flatMap((run) => run.data?.main?.[branch] ?? []),
	);
}
