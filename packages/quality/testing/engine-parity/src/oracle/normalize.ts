import { isRecord } from '@n8n/utils/is-record';
import type { INodeExecutionData, IRunData, ITaskData } from 'n8n-workflow';

import type { ParityCase } from '../grammar/ir';
import type { RawOutcome } from '../runners/runner';

export type Item = Record<string, unknown>;

export type NodeRun = {
	/** The items of each output, `json` only. */
	outputs: Item[][];
	/** The `pairedItem` of each item, in the same shape as `outputs`. */
	pairedItem: unknown[][];
	failed: boolean;
};

/** Both engines report in this one format. Timings, IDs, hints and metadata are gone. */
export type Outcome = {
	/** `success` or `error`, or the status of an engine as it is, for example `waiting`. */
	status: string;
	error?: { node: string; class: string };
	/** The items of the nodes that have no outgoing connection, all runs and outputs. */
	terminal: Item[];
	/** One entry for each run. */
	nodes: Record<string, NodeRun[]>;
	/** The node runs in run order, as `node#run`. */
	runOrder: string[];
};

const STATUS = new Map([
	['success', 'success'],
	['completed', 'success'],
	['error', 'error'],
	['failed', 'error'],
]);

/** The failing node is the node of the workflow that failed. */
function normalizeError(error: unknown, lastNodeExecuted?: string): Outcome['error'] {
	if (!isRecord(error)) return undefined;
	const node =
		isRecord(error.node) && typeof error.node.name === 'string' ? error.node.name : undefined;
	return {
		node: lastNodeExecuted ?? node ?? '',
		class: typeof error.name === 'string' ? error.name : 'Error',
	};
}

function normalizeRun(task: ITaskData): NodeRun {
	const slots: Array<INodeExecutionData[] | null> = task.data?.main ?? [];
	const outputs = slots.map((slot) => (slot ?? []).map((item): Item => item.json));
	const pairedItem = slots.map((slot) => (slot ?? []).map((item) => item.pairedItem ?? null));
	// A trailing output without items reads the same as no output.
	while (outputs.length > 0 && outputs[outputs.length - 1].length === 0) {
		outputs.pop();
		pairedItem.pop();
	}
	return {
		outputs,
		pairedItem,
		failed: task.executionStatus === 'error' || task.error !== undefined,
	};
}

/** The nodes with no outgoing connection, which hold the final output. */
export function sinkNodes(parityCase: ParityCase): Set<string> {
	const withOutgoing = new Set(
		Object.entries(parityCase.workflow.connections)
			.filter(([, byType]) => (byType.main ?? []).some((slot) => (slot?.length ?? 0) > 0))
			.map(([source]) => source),
	);
	return new Set(
		parityCase.workflow.nodes.map((node) => node.name).filter((name) => !withOutgoing.has(name)),
	);
}

function runOrder(runData: IRunData): string[] {
	return Object.entries(runData)
		.flatMap(([node, tasks]) =>
			tasks.map((task, run) => ({ key: `${node}#${run}`, index: task.executionIndex ?? 0 })),
		)
		.sort((a, b) => a.index - b.index)
		.map(({ key }) => key);
}

/** Returns `undefined` when the engine did not run the case. */
export function normalize(raw: RawOutcome, parityCase: ParityCase): Outcome | undefined {
	if (raw.kind !== 'ran') return undefined;
	const sinks = sinkNodes(parityCase);
	const nodes: Record<string, NodeRun[]> = {};
	const terminal: Item[] = [];
	for (const [name, tasks] of Object.entries(raw.runData)) {
		nodes[name] = tasks.map(normalizeRun);
		if (sinks.has(name)) terminal.push(...nodes[name].flatMap((run) => run.outputs.flat()));
	}
	const status = STATUS.get(raw.status) ?? raw.status;
	return {
		status,
		...(status === 'error' ? { error: normalizeError(raw.error, raw.lastNodeExecuted) } : {}),
		terminal,
		nodes,
		runOrder: runOrder(raw.runData),
	};
}

/** JSON with sorted keys, so that equal items give equal strings. */
export function canonical(value: unknown): string {
	return JSON.stringify(value, (_key, entry: unknown) =>
		isRecord(entry)
			? Object.fromEntries(
					Object.keys(entry)
						.sort()
						.map((key) => [key, entry[key]]),
				)
			: entry,
	);
}
