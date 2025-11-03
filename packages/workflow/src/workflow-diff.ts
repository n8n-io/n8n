import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import type { INode, IWorkflowBase } from '.';

export const enum NodeDiffStatus {
	Eq = 'equal',
	Modified = 'modified',
	Added = 'added',
	Deleted = 'deleted',
}

export type NodeDiff<T> = {
	status: NodeDiffStatus;
	node: T;
};

export type WorkflowDiff<T> = Map<string, NodeDiff<T>>;

export function compareNodes<T extends { id: string }>(
	base: T | undefined,
	target: T | undefined,
): boolean {
	const propsToCompare = ['name', 'type', 'typeVersion', 'webhookId', 'credentials', 'parameters'];

	const baseNode = pick(base, propsToCompare);
	const targetNode = pick(target, propsToCompare);

	return isEqual(baseNode, targetNode);
}

export function compareWorkflowsNodes<T extends { id: string }>(
	base: T[],
	target: T[],
	nodesEqual: (base: T | undefined, target: T | undefined) => boolean = compareNodes,
): WorkflowDiff<T> {
	const baseNodes = base.reduce<Map<string, T>>((acc, node) => {
		acc.set(node.id, node);
		return acc;
	}, new Map());

	const targetNodes = target.reduce<Map<string, T>>((acc, node) => {
		acc.set(node.id, node);
		return acc;
	}, new Map());

	const diff: WorkflowDiff<T> = new Map();

	for (const [id, node] of baseNodes.entries()) {
		if (!targetNodes.has(id)) {
			diff.set(id, { status: NodeDiffStatus.Deleted, node });
		} else if (!nodesEqual(baseNodes.get(id), targetNodes.get(id))) {
			diff.set(id, { status: NodeDiffStatus.Modified, node });
		} else {
			diff.set(id, { status: NodeDiffStatus.Eq, node });
		}
	}

	for (const [id, node] of targetNodes.entries()) {
		if (!baseNodes.has(id)) {
			diff.set(id, { status: NodeDiffStatus.Added, node });
		}
	}

	return diff;
}

type ChangeType<N extends INode> = NodeDiff<N>;

function mergeNodeDiff(
	prev: NodeDiffStatus,
	next: NodeDiffStatus,
): NodeDiffStatus | 'undone' | 'invariant broken' {
	switch (prev) {
		case NodeDiffStatus.Added:
			switch (next) {
				case NodeDiffStatus.Added:
					return 'invariant broken';
				case NodeDiffStatus.Deleted:
					return 'undone';
				default:
					return NodeDiffStatus.Added;
			}
		case NodeDiffStatus.Deleted:
			switch (next) {
				case NodeDiffStatus.Added:
					return NodeDiffStatus.Modified;
				default:
					return 'invariant broken';
			}
		case NodeDiffStatus.Eq:
			switch (next) {
				case NodeDiffStatus.Added:
					return 'invariant broken';
				default:
					return next;
			}
		case NodeDiffStatus.Modified:
			switch (next) {
				case NodeDiffStatus.Added:
					return 'invariant broken';
				case NodeDiffStatus.Deleted:
					return NodeDiffStatus.Deleted;
				default:
					return NodeDiffStatus.Modified;
			}
	}
}

class WorkflowChangeSet<T extends { id: string }> {
	constructor(public nodes: WorkflowDiff<T> = new Map()) {}

	hasChanges() {
		for (const nodeDiff of this.nodes.values()) {
			if (nodeDiff.status !== NodeDiffStatus.Eq) return true;
		}
		return false;
	}

	mergeNext(wcs: WorkflowChangeSet<T>) {
		for (const [key, diff] of wcs.nodes) {
			const existing = this.nodes.get(key);
			if (existing) {
				const diffStatus = mergeNodeDiff(existing.status, diff.status);
				if (diffStatus === 'invariant broken') {
					throw new Error('invariant broken');
				}
				if (diffStatus === 'undone') {
					this.nodes.delete(key);
				} else {
					this.nodes.set(key, { ...diff, status: diffStatus });
				}
			}
		}
	}
}

type GroupedWorkflowHistory<W extends IWorkflowBase> = {
	workflowChangeSet: WorkflowChangeSet<W['nodes'][number]>;
	groupedWorkflows: W[];
	from: W;
	to: W;
};

function compareWorkflows<W extends IWorkflowBase = IWorkflowBase>(
	previous: W,
	next: W,
): GroupedWorkflowHistory<W> {
	const nodesDiff = compareWorkflowsNodes(previous.nodes, next.nodes);
	const workflowChangeSet = new WorkflowChangeSet(nodesDiff);
	return {
		workflowChangeSet,
		groupedWorkflows: [],
		from: previous,
		to: next,
	};
}

export type DiffRule<W extends IWorkflowBase = IWorkflowBase> = (
	prev: GroupedWorkflowHistory<W>,
	next: GroupedWorkflowHistory<W>,
) => boolean;

export function groupWorkflows<W extends IWorkflowBase = IWorkflowBase>(
	workflows: W[],
	rules: Array<DiffRule<W>>,
): Array<GroupedWorkflowHistory<W>> {
	if (workflows.length === 0) return [];
	if (workflows.length === 1) {
		return [
			{
				workflowChangeSet: new WorkflowChangeSet(),
				groupedWorkflows: [],
				from: workflows[0],
				to: workflows[0],
			},
		];
	}

	const diffs: Array<GroupedWorkflowHistory<W>> = [];

	for (let i = 0; i < workflows.length - 1; ++i) {
		diffs.push(compareWorkflows(workflows[i], workflows[i + 1]));
	}
	let prevDiffsLength = diffs.length;
	do {
		prevDiffsLength = diffs.length;
		for (const rule of rules) {
			const n = diffs.length;
			for (let i = n - 1; i > 0; --i) {
				const shouldMerge = rule(diffs[i - 1], diffs[i]);
				if (shouldMerge) {
					const right = diffs.pop();
					if (!right) throw new Error('invariant broken');

					// merge diffs
					diffs[i - 1].workflowChangeSet.mergeNext(right.workflowChangeSet);
					diffs[i - 1].groupedWorkflows.push(diffs[i - 1].to);
					diffs[i - 1].groupedWorkflows.push(...right.groupedWorkflows);
					diffs[i - 1].to = right.to;
				}
			}
		}
	} while (prevDiffsLength !== diffs.length);

	return diffs;
}
