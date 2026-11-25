import { getEntry } from '../grammar/catalog';
import type { ParityCase } from '../grammar/ir';
import type { ParityRules, Severity } from '../grammar/rules';
import { canonical } from './normalize';
import type { Item, NodeRun, Outcome } from './normalize';

/**
 * - L0: status, failing node, error class.
 * - L1: terminal output, as a multiset.
 * - L2: items for each node, run and output, as a multiset.
 * - L3: item order and run order.
 * - L4: `pairedItem` lineage.
 */
export type Level = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export interface Diff {
	level: Level;
	/** A short kind, for example `status` or `items`. Signatures use it. */
	kind: string;
	node?: string;
	run?: number;
	output?: number;
	severity: Severity;
	message: string;
	v1?: unknown;
	v2?: unknown;
}

/** The items that only one side has, with their counts. */
function multisetDiff(a: Item[], b: Item[]) {
	const counts = new Map<string, number>();
	for (const item of a) counts.set(canonical(item), (counts.get(canonical(item)) ?? 0) + 1);
	for (const item of b) counts.set(canonical(item), (counts.get(canonical(item)) ?? 0) - 1);
	const onlyV1: string[] = [];
	const onlyV2: string[] = [];
	for (const [item, count] of counts) {
		for (let i = 0; i < Math.abs(count); i++) (count > 0 ? onlyV1 : onlyV2).push(item);
	}
	return { equal: onlyV1.length === 0 && onlyV2.length === 0, onlyV1, onlyV2 };
}

function sameSequence(a: unknown[], b: unknown[]): boolean {
	return a.length === b.length && a.every((entry, i) => canonical(entry) === canonical(b[i]));
}

function isOrderSensitive(parityCase: ParityCase, nodeName: string): boolean {
	const irNode = parityCase.ir.nodes.find((node) => node.key === nodeName);
	return irNode ? getEntry(irNode.catalogId).orderSensitive === true : false;
}

function compareRun(
	node: string,
	run: number,
	v1: NodeRun,
	v2: NodeRun,
	parityCase: ParityCase,
	rules: ParityRules,
): Diff[] {
	const diffs: Diff[] = [];
	const outputs = Math.max(v1.outputs.length, v2.outputs.length);
	for (let output = 0; output < outputs; output++) {
		const items1 = v1.outputs[output] ?? [];
		const items2 = v2.outputs[output] ?? [];
		const where = { node, run, output };
		const multiset = multisetDiff(items1, items2);
		if (!multiset.equal) {
			diffs.push({
				level: 'L2',
				kind: 'items',
				...where,
				severity: 'fail',
				message: `"${node}" run ${run} output ${output} has different items`,
				v1: multiset.onlyV1,
				v2: multiset.onlyV2,
			});
			continue;
		}
		if (!sameSequence(items1, items2)) {
			diffs.push({
				level: 'L3',
				kind: 'itemOrder',
				...where,
				severity: isOrderSensitive(parityCase, node) ? 'fail' : rules.severity.L3,
				message: `"${node}" run ${run} output ${output} has the same items in a different order`,
				v1: items1,
				v2: items2,
			});
			continue;
		}
		const paired1 = v1.pairedItem[output] ?? [];
		const paired2 = v2.pairedItem[output] ?? [];
		if (!sameSequence(paired1, paired2)) {
			diffs.push({
				level: 'L4',
				kind: 'pairedItem',
				...where,
				severity: rules.severity.L4,
				message: `"${node}" run ${run} output ${output} has a different pairedItem lineage`,
				v1: paired1,
				v2: paired2,
			});
		}
	}
	return diffs;
}

function ranToSuccess(outcome: Outcome, node: string): boolean {
	return (outcome.nodes[node] ?? []).some((run) => !run.failed);
}

/**
 * Both runs failed, and which failure came first depends on run order. Engine
 * v1 runs branches one after another and engine v2 can run them in parallel.
 * So the failing node, and the other nodes that ran before the failure, can
 * differ. That is L3. It holds when both runs failed on the same node with
 * the same error, or when each engine failed on a node that the other engine
 * did not run to success.
 */
function failureDependsOnOrder(v1: Outcome, v2: Outcome): boolean {
	if (v1.status !== 'error' || v2.status !== 'error' || !v1.error || !v2.error) return false;
	if (v1.error.node === v2.error.node) return v1.error.class === v2.error.class;
	return !ranToSuccess(v2, v1.error.node) && !ranToSuccess(v1, v2.error.node);
}

function isTrigger(parityCase: ParityCase, nodeName: string): boolean {
	return parityCase.ir.triggers.some((trigger) => trigger.key === nodeName);
}

/** True when the fired trigger can reach `target` without going through `skip`. */
function reachable(parityCase: ParityCase, target: string, skip?: string): boolean {
	const { connections } = parityCase.workflow;
	const seen = new Set<string>();
	const queue = [parityCase.ir.firedTrigger];
	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined || current === skip || seen.has(current)) continue;
		if (current === target) return true;
		seen.add(current);
		for (const outputs of Object.values(connections[current] ?? {})) {
			for (const output of outputs ?? []) {
				for (const connection of output ?? []) queue.push(connection.node);
			}
		}
	}
	return false;
}

/** True when every path from the fired trigger to `target` goes through `node`. */
function isOnEveryPath(parityCase: ParityCase, node: string, target: string): boolean {
	if (node === target) return true;
	return reachable(parityCase, target) && !reachable(parityCase, target, node);
}

/**
 * A node that one engine did not run, but that the engine had to run before
 * it got to its failing node. No order of branches explains that.
 */
function skippedRequiredNode(diff: Diff, v1: Outcome, v2: Outcome, parityCase: ParityCase) {
	if (diff.kind !== 'nodeRan' || !diff.node) return false;
	const failingNode = (v1.nodes[diff.node] ? v2 : v1).error?.node;
	return failingNode !== undefined && isOnEveryPath(parityCase, diff.node, failingNode);
}

export function compare(
	v1: Outcome,
	v2: Outcome,
	parityCase: ParityCase,
	rules: ParityRules,
): Diff[] {
	const byOrder = failureDependsOnOrder(v1, v2);
	return compareStrict(v1, v2, parityCase, rules)
		.filter(
			// The runners give the trigger its items, so its lineage is not engine output.
			(diff) => !(diff.kind === 'pairedItem' && diff.node && isTrigger(parityCase, diff.node)),
		)
		.map((diff): Diff => {
			// A node that ran on both engines must still give the same items.
			if (
				!byOrder ||
				diff.level === 'L3' ||
				diff.level === 'L4' ||
				diff.kind === 'items' ||
				skippedRequiredNode(diff, v1, v2, parityCase)
			) {
				return diff;
			}
			return {
				...diff,
				level: 'L3',
				kind: `${diff.kind}ByOrder`,
				severity: rules.severity.L3,
				message: `${diff.message}. Both runs failed, and the order of branches decides where`,
			};
		});
}

function compareStrict(
	v1: Outcome,
	v2: Outcome,
	parityCase: ParityCase,
	rules: ParityRules,
): Diff[] {
	const diffs: Diff[] = [];

	if (v1.status !== v2.status) {
		diffs.push({
			level: 'L0',
			kind: 'status',
			severity: 'fail',
			message: `The status is "${v1.status}" on v1 and "${v2.status}" on v2`,
			v1: { status: v1.status, error: v1.error },
			v2: { status: v2.status, error: v2.error },
		});
	} else if (v1.error && v2.error) {
		if (v1.error.node !== v2.error.node) {
			diffs.push({
				level: 'L0',
				kind: 'errorNode',
				node: v1.error.node,
				severity: 'fail',
				message: `The failing node is "${v1.error.node}" on v1 and "${v2.error.node}" on v2`,
				v1: v1.error,
				v2: v2.error,
			});
		}
		if (v1.error.class !== v2.error.class) {
			diffs.push({
				level: 'L0',
				kind: 'errorClass',
				node: v1.error.node,
				severity: 'fail',
				message: `The error class is ${v1.error.class} on v1 and ${v2.error.class} on v2`,
				v1: v1.error,
				v2: v2.error,
			});
		}
	}

	const terminal = multisetDiff(v1.terminal, v2.terminal);
	if (!terminal.equal) {
		diffs.push({
			level: 'L1',
			kind: 'terminal',
			severity: 'fail',
			message: 'The terminal output has different items',
			v1: terminal.onlyV1,
			v2: terminal.onlyV2,
		});
	}

	let sameRuns = true;
	const names = [...new Set([...Object.keys(v1.nodes), ...Object.keys(v2.nodes)])].sort();
	for (const node of names) {
		const runs1 = v1.nodes[node];
		const runs2 = v2.nodes[node];
		if (!runs1 || !runs2) {
			sameRuns = false;
			diffs.push({
				level: 'L2',
				kind: 'nodeRan',
				node,
				severity: 'fail',
				message: `"${node}" ran on ${runs1 ? 'v1' : 'v2'} only`,
				v1: runs1?.length ?? 0,
				v2: runs2?.length ?? 0,
			});
			continue;
		}
		if (runs1.length !== runs2.length) {
			sameRuns = false;
			diffs.push({
				level: 'L2',
				kind: 'runCount',
				node,
				severity: 'fail',
				message: `"${node}" ran ${runs1.length} times on v1 and ${runs2.length} times on v2`,
				v1: runs1.length,
				v2: runs2.length,
			});
		}
		const runs = Math.min(runs1.length, runs2.length);
		for (let run = 0; run < runs; run++) {
			diffs.push(...compareRun(node, run, runs1[run], runs2[run], parityCase, rules));
		}
	}

	if (sameRuns && !sameSequence(v1.runOrder, v2.runOrder)) {
		diffs.push({
			level: 'L3',
			kind: 'runOrder',
			severity: rules.severity.L3,
			message: 'The nodes ran in a different order',
			v1: v1.runOrder,
			v2: v2.runOrder,
		});
	}

	return diffs;
}
