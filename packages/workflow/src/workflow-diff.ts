import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

import type { IConnections, INode, IWorkflowBase } from '.';

export type DiffableNode = Pick<INode, 'id' | 'parameters' | 'name'>;
export type DiffableWorkflow<N extends DiffableNode = DiffableNode> = {
	nodes: N[];
};

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

export function compareNodes<T extends DiffableNode>(
	base: T | undefined,
	target: T | undefined,
): boolean {
	const propsToCompare = ['name', 'type', 'typeVersion', 'webhookId', 'credentials', 'parameters'];

	const baseNode = pick(base, propsToCompare);
	const targetNode = pick(target, propsToCompare);

	return isEqual(baseNode, targetNode);
}

export function compareWorkflowsNodes<T extends DiffableNode>(
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

export class WorkflowChangeSet<T extends DiffableNode> {
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
			} else {
				this.nodes.set(key, { ...diff, status: NodeDiffStatus.Added });
			}
		}
	}
}

// determines whether the second node is a "superset" of the first one, i.e. whether no data
// is lost if we were to cleanse the first node
function nodeIsAdditive<T extends DiffableNode>(prevNode: T, nextNode: T) {
	const { parameters: prevParams, ...prev } = prevNode;
	const { parameters: nextParams, ...next } = nextNode;

	// abort if the nodes don't match besides parameters
	if (!compareNodes({ ...prev, parameters: {} }, { ...next, parameters: {} })) return false;

	const params = Object.keys(prevParams);
	// abort if prev has some field next does not have
	if (params.some((x) => !Object.prototype.hasOwnProperty.call(nextParams, x))) return false;

	for (const key of params) {
		const left = prevParams[key];
		const right = nextParams[key];
		// non-strings must be exactly equal to not be lost data
		if (typeof left === 'string' && typeof right === 'string') {
			// strings must only be contained in the new string
			if (!right.includes(left)) return false;
		} else if (left !== right) return false;
	}

	return true;
}

function mergeAdditiveChanges<N extends DiffableNode = DiffableNode>(
	_prev: GroupedWorkflowHistory<DiffableWorkflow<N>>,
	next: GroupedWorkflowHistory<DiffableWorkflow<N>>,
	diff: WorkflowDiff<N>,
) {
	for (const d of diff.values()) {
		if (d.status === NodeDiffStatus.Deleted) return false;
		if (d.status === NodeDiffStatus.Added) continue;
		const nextNode = next.from.nodes.find((x) => x.name === d.node.name);
		if (!nextNode) throw new Error('invariant broken');
		if (d.status === NodeDiffStatus.Modified && !nodeIsAdditive(d.node, nextNode)) return false;
	}
	return true;
}

export const RULES = {
	mergeAdditiveChanges,
};

type GroupedWorkflowHistory<W extends DiffableWorkflow<DiffableNode>> = {
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

export type DiffRule<
	W extends IWorkflowBase = IWorkflowBase,
	N extends W['nodes'][number] = W['nodes'][number],
> = (
	prev: GroupedWorkflowHistory<W>,
	next: GroupedWorkflowHistory<W>,
	diff: WorkflowDiff<N>,
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
		const n = diffs.length;
		for (let i = n - 1; i > 0; --i) {
			const diff = compareWorkflowsNodes(diffs[i - 1].from.nodes, diffs[i].to.nodes);
			for (const rule of rules) {
				const shouldMerge = rule(diffs[i - 1], diffs[i], diff);
				if (shouldMerge) {
					const right = diffs.pop();
					if (!right) throw new Error('invariant broken');

					// merge diffs
					diffs[i - 1].workflowChangeSet.mergeNext(right.workflowChangeSet);
					diffs[i - 1].groupedWorkflows.push(diffs[i - 1].to);
					diffs[i - 1].groupedWorkflows.push(...right.groupedWorkflows);
					diffs[i - 1].to = right.to;
					break;
				}
			}
		}
	} while (prevDiffsLength !== diffs.length);

	return diffs;
}

/**
 * Checks if workflows have non-positional differences (changes to nodes or connections,
 * excluding position changes).
 * Returns true if there are meaningful changes, false if only positions changed.
 */
export function hasNonPositionalChanges(
	oldNodes: INode[],
	newNodes: INode[],
	oldConnections: IConnections,
	newConnections: IConnections,
): boolean {
	// Check for node changes (compareNodes already excludes position)
	const nodesDiff = compareWorkflowsNodes(oldNodes, newNodes);
	for (const diff of nodesDiff.values()) {
		if (diff.status !== NodeDiffStatus.Eq) {
			return true;
		}
	}

	// Check for connection changes (connections don't have position data)
	if (!isEqual(oldConnections, newConnections)) {
		return true;
	}

	return false;
}

/**
 * Checks if any credential IDs changed between old and new workflow nodes.
 * Compares node by node - returns true if for any node:
 * - A credential was added (new credential type not in old node)
 * - A credential was removed (old credential type not in new node)
 * - A credential was changed (same credential type but different credential ID)
 */
export function hasCredentialChanges(oldNodes: INode[], newNodes: INode[]): boolean {
	const newNodesMap = new Map(newNodes.map((node) => [node.id, node]));

	for (const oldNode of oldNodes) {
		const newNode = newNodesMap.get(oldNode.id);

		// Skip nodes that were deleted - deletion is not a credential change
		if (!newNode) continue;

		const oldCreds = oldNode.credentials ?? {};
		const newCreds = newNode.credentials ?? {};

		const oldCredTypes = Object.keys(oldCreds);
		const newCredTypes = Object.keys(newCreds);

		// Check for removed credentials (in old but not in new)
		for (const credType of oldCredTypes) {
			if (!(credType in newCreds)) {
				return true; // Credential removed
			}
			// Check for changed credentials (same type but different ID)
			if (oldCreds[credType]?.id !== newCreds[credType]?.id) {
				return true; // Credential changed
			}
		}

		// Check for added credentials (in new but not in old)
		for (const credType of newCredTypes) {
			if (!(credType in oldCreds)) {
				return true; // Credential added
			}
		}
	}

	return false;
}
