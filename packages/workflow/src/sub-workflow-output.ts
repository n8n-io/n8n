import { NodeConnectionTypes } from './interfaces';
import type {
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	IRunData,
	ITaskData,
	WorkflowExecuteMode,
} from './interfaces';

/**
 * Whether the sub-workflow's `Execute Workflow Trigger` wants the legacy single-run output.
 * v1.2+ triggers always opt into the new merged-runs default;
 * pre-1.2 triggers can opt in via the `returnOutput` parameter
 * and otherwise stay on `lastRunOnly` for backward compatibility.
 * Sub-workflows without an `Execute Workflow Trigger` keep the legacy output too.
 * See n8n-io/n8n#9989
 */
export function triggerReturnsLastRunOnly(nodes: INode[]): boolean {
	const trigger = nodes.find((node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger');
	const triggerVersion = trigger?.typeVersion ?? 1;
	return triggerVersion < 1.2 && trigger?.parameters?.returnOutput !== 'allRuns';
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

export function flattenSubWorkflowBranches(
	branches: Array<INodeExecutionData[] | null>,
): INodeExecutionData[] {
	return branches.flatMap((branch) => branch ?? []);
}

function hasOutgoingMainConnections(nodeName: string, connections: IConnections): boolean {
	const mainConnections = connections[nodeName]?.[NodeConnectionTypes.Main];
	if (!mainConnections) {
		return false;
	}

	return mainConnections.some((output) => output && output.length > 0);
}

/**
 * Nodes with no outgoing main connections — the sub-workflow's natural output points.
 */
export function getTerminalNodeNames(nodes: INode[], connections: IConnections): string[] {
	return nodes
		.filter((node) => !node.disabled)
		.map((node) => node.name)
		.filter((name) => !hasOutgoingMainConnections(name, connections));
}

export function getSortedNodeRuns(runData: IRunData, nodeName: string): ITaskData[] {
	const runs = runData[nodeName];
	if (!runs) {
		return [];
	}

	return [...runs].sort((a, b) => (a.executionIndex ?? 0) - (b.executionIndex ?? 0));
}

function pinDataToMainOutput(pinData: unknown): Array<INodeExecutionData[] | null> {
	let items = pinData;
	if (!Array.isArray(items)) {
		items = [items];
	}

	const itemsPerRun = (items as IDataObject[]).map((item, index) => ({
		json: item,
		pairedItem: { item: index },
	}));

	return [itemsPerRun];
}

function outputFromNodeRuns(runs: ITaskData[], lastRunOnly: boolean): INodeExecutionData[] {
	if (runs.length === 0) {
		return [];
	}

	const branches = lastRunOnly
		? (runs[runs.length - 1].data?.main ?? [])
		: mergeRunsPerBranch(runs);

	return flattenSubWorkflowBranches(branches);
}

function collectTerminalOutputItems(
	runData: IRunData,
	terminalNodeNames: string[],
	lastRunOnly: boolean,
): INodeExecutionData[] {
	const runsInProductionOrder = terminalNodeNames
		.flatMap((nodeName) => {
			const runs = getSortedNodeRuns(runData, nodeName);
			const selectedRuns = lastRunOnly && runs.length > 0 ? [runs[runs.length - 1]] : runs;
			return selectedRuns.map((run) => ({ nodeName, run }));
		})
		.sort((a, b) => (a.run.executionIndex ?? 0) - (b.run.executionIndex ?? 0));

	return runsInProductionOrder.flatMap(({ run }) =>
		flattenSubWorkflowBranches(run.data?.main ?? []),
	);
}

export interface SubWorkflowOutputOptions {
	lastRunOnly: boolean;
	mode?: WorkflowExecuteMode;
	pinData?: Record<string, unknown>;
}

/**
 * Builds the single main output the parent Execute Workflow node should receive.
 * Collects items from terminal nodes (not `lastNodeExecuted`) and flattens
 * multi-branch node output onto one branch.
 */
export function buildSubWorkflowOutputFromRunData(
	resultData: {
		runData: IRunData;
		lastNodeExecuted?: string;
		pinData?: Record<string, unknown>;
	},
	workflow: { nodes: INode[]; connections: IConnections },
	options: SubWorkflowOutputOptions,
): Array<INodeExecutionData[] | null> {
	const { runData, lastNodeExecuted, pinData = {} } = resultData;
	const { lastRunOnly, mode } = options;

	if (mode === 'manual') {
		for (const nodeName of getTerminalNodeNames(workflow.nodes, workflow.connections)) {
			if (pinData[nodeName] !== undefined) {
				return pinDataToMainOutput(pinData[nodeName]);
			}
		}

		if (lastNodeExecuted !== undefined && pinData[lastNodeExecuted] !== undefined) {
			return pinDataToMainOutput(pinData[lastNodeExecuted]);
		}
	}

	// Only count a terminal node as contributing when it has at least one run with actual
	// `main` output items. This excludes AI subnodes (data keyed `ai_*`, not `main`) and
	// nodes that ran but produced zero items (e.g. Split Out over an empty array), so the
	// `lastNodeExecuted` fallback can still fire in those cases.
	const terminalNodesWithMainOutput = getTerminalNodeNames(
		workflow.nodes,
		workflow.connections,
	).filter((nodeName) =>
		getSortedNodeRuns(runData, nodeName).some((run) =>
			run.data?.main?.some((branch) => branch && branch.length > 0),
		),
	);

	if (terminalNodesWithMainOutput.length > 0) {
		const items = collectTerminalOutputItems(runData, terminalNodesWithMainOutput, lastRunOnly);
		return items.length > 0 ? [items] : [null];
	}

	if (lastNodeExecuted !== undefined) {
		const items = outputFromNodeRuns(getSortedNodeRuns(runData, lastNodeExecuted), lastRunOnly);
		return items.length > 0 ? [items] : [null];
	}

	return [null];
}
