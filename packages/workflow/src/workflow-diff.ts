import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

import type {
	IConnections,
	INode,
	INodeParameters,
	IWorkflowBase,
	NodeParameterValueType,
} from '.';
import { compareConnections, type ConnectionsDiff } from './connections-diff';

export type WorkflowDiffBase = Omit<
	IWorkflowBase,
	'id' | 'active' | 'activeVersionId' | 'isArchived' | 'name'
> & { name: string | null };

export type DiffableNode = Pick<INode, 'id' | 'parameters' | 'name'>;
export type DiffableWorkflow<N extends DiffableNode = DiffableNode> = {
	nodes: N[];
	connections: IConnections;
	createdAt: Date;
	authors?: string;
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

export class WorkflowChangeSet<T extends DiffableNode> {
	readonly nodes: WorkflowDiff<T>;
	readonly connections: ConnectionsDiff;

	constructor(from: DiffableWorkflow<T>, to: DiffableWorkflow<T>) {
		if (from === to) {
			// avoid expensive deep comparison
			this.nodes = new Map(
				from.nodes.map((node) => [node.id, { node, status: NodeDiffStatus.Eq }]),
			);
			this.connections = { added: {}, removed: {} };
		} else {
			this.nodes = compareWorkflowsNodes(from.nodes, to.nodes);
			this.connections = compareConnections(from.connections, to.connections);
		}
	}
}

/**
 * Returns true if `s` contains all characters of `substr` in order
 * e.g. s='abcde'
 * substr:
 *  'abde' -> true
 *  'abcd' -> false
 *  'abced' -> false
 */
export function stringContainsParts(s: string, substr: string) {
	if (substr.length > s.length) return false;
	const diffSize = s.length - substr.length;
	let marker = 0;
	for (let i = 0; i < s.length; ++i) {
		if (substr[marker] === s[i]) marker++;

		if (i - marker > diffSize) return false;
	}
	return marker >= substr.length;
}

export function parametersAreSuperset(prev: unknown, next: unknown): boolean {
	if (typeof prev !== typeof next) return false;
	if (typeof prev !== 'object' || !prev || !next) {
		if (typeof prev === 'string') {
			// We assert above that these are the same type
			return stringContainsParts(next as string, prev);
		}
		return prev === next;
	}

	if (Array.isArray(prev)) {
		if (!Array.isArray(next)) return false;
		if (prev.length !== next.length) return false;
		return prev.every((v, i) => parametersAreSuperset(v, next[i]));
	}

	const params = Object.keys(prev);

	if (params.length !== Object.keys(next).length) return false;
	// abort if keys differ
	if (params.some((x) => !Object.prototype.hasOwnProperty.call(next, x))) return false;

	return params.every((key) =>
		parametersAreSuperset(
			(prev as Record<string, unknown>)[key],
			(next as Record<string, unknown>)[key],
		),
	);
}

/**
 * Determines whether the second node is a "superset" of the first one, i.e. whether no data
 * is lost if we were to replace `prev` with `next`.
 *
 * Specifically this is the case if
 * - Both nodes have the exact same keys
 * - All values are either strings where `next.x` contains `prev.x`, or hold the exact same value
 */
function nodeIsSuperset<T extends DiffableNode>(prevNode: T, nextNode: T) {
	const { parameters: prevParams, ...prev } = prevNode;
	const { parameters: nextParams, ...next } = nextNode;

	// abort if the nodes don't match besides parameters
	if (!compareNodes({ ...prev, parameters: {} }, { ...next, parameters: {} })) return false;

	return parametersAreSuperset(prevParams, nextParams);
}

function mergeAdditiveChanges<N extends DiffableNode = DiffableNode>(
	_prev: DiffableWorkflow<N>,
	next: DiffableWorkflow<N>,
	diff: WorkflowChangeSet<N>,
) {
	for (const d of diff.nodes.values()) {
		if (d.status === NodeDiffStatus.Deleted) return false;
		if (d.status === NodeDiffStatus.Added) continue;
		const nextNode = next.nodes.find((x) => x.id === d.node.id);
		if (!nextNode) throw new Error('invariant broken - no next node');
		if (d.status === NodeDiffStatus.Modified && !nodeIsSuperset(d.node, nextNode)) return false;
	}

	if (Object.keys(diff.connections.removed).length > 0) return false;

	return true;
}

// We want to avoid merging versions from different editing "sessions"
//
const makeSkipTimeDifference = (timeDiffMs: number) => {
	return <N extends DiffableNode = DiffableNode>(
		prev: DiffableWorkflow<N>,
		next: DiffableWorkflow<N>,
	) => {
		const timeDifference = next.createdAt.getTime() - prev.createdAt.getTime();

		return Math.abs(timeDifference) > timeDiffMs;
	};
};

const makeMergeShortTimeSpan = (timeDiffMs: number) => {
	return <N extends DiffableNode = DiffableNode>(
		prev: DiffableWorkflow<N>,
		next: DiffableWorkflow<N>,
	) => {
		const timeDifference = next.createdAt.getTime() - prev.createdAt.getTime();

		return Math.abs(timeDifference) < timeDiffMs;
	};
};

// Takes a mapping from minimumSize to the minimum time between versions and
// applies the largest one applicable to the given workflow
function makeMergeDependingOnSizeRule<W extends DiffableWorkflow>(mapping: Map<number, number>) {
	const pairs = [...mapping.entries()]
		.sort((a, b) => b[0] - a[0])
		.map(([count, time]) => [count, makeMergeShortTimeSpan(time)] as const);

	return <N extends DiffableNode = DiffableNode>(
		prev: DiffableWorkflow<N>,
		next: DiffableWorkflow<N>,
		_wcs: WorkflowChangeSet<N>,
		metaData: DiffMetaData,
	) => {
		if (metaData.workflowSizeScore === undefined) {
			console.warn('Called mergeDependingOnSizeRule rule without providing required metaData');
			return false;
		}
		for (const [count, time] of pairs) {
			if (metaData.workflowSizeScore > count) return time(prev, next);
		}
		return false;
	};
}

function skipDifferentUsers<N extends DiffableNode = DiffableNode>(
	prev: DiffableWorkflow<N>,
	next: DiffableWorkflow<N>,
) {
	return next.authors !== prev.authors;
}

export const RULES = {
	mergeAdditiveChanges,
	makeMergeDependingOnSizeRule,
};

export const SKIP_RULES = {
	makeSkipTimeDifference,
	skipDifferentUsers,
};

// MetaData fields are only included if requested
export type DiffMetaData = Partial<{
	workflowSizeScore: number;
}>;

export type DiffRule<
	W extends WorkflowDiffBase = WorkflowDiffBase,
	N extends W['nodes'][number] = W['nodes'][number],
> = (prev: W, next: W, diff: WorkflowChangeSet<N>, metaData: Partial<DiffMetaData>) => boolean;

// Rough estimation of a node's size in abstract "character" count
// Does not care about key names which do technically factor in when stringified
export function determineNodeSize(parameters: INodeParameters | NodeParameterValueType): number {
	if (!parameters) return 1;

	if (typeof parameters === 'string') {
		return parameters.length;
	} else if (typeof parameters !== 'object' || parameters instanceof Date) {
		return 1;
	} else if (Array.isArray(parameters)) {
		return parameters.reduce<number>((acc, v) => acc + determineNodeSize(v as INodeParameters), 1);
	} else {
		// Record case
		return Object.values(parameters).reduce<number>(
			(acc, v) => acc + determineNodeSize(v as NodeParameterValueType),
			1,
		);
	}
}

function determineNodeParametersSize<W extends WorkflowDiffBase>(workflow: W) {
	return workflow.nodes.reduce((acc, x) => acc + determineNodeSize(x.parameters), 0);
}

export function groupWorkflows<W extends WorkflowDiffBase = WorkflowDiffBase>(
	workflows: W[],
	rules: Array<DiffRule<W>>,
	skipRules: Array<DiffRule<W>> = [],
	metaDataFields?: Partial<Record<keyof DiffMetaData, boolean>>,
): { removed: W[]; remaining: W[] } {
	if (workflows.length === 0) return { removed: [], remaining: [] };
	if (workflows.length === 1) {
		return {
			removed: [],
			remaining: workflows,
		};
	}

	const remaining = [...workflows];
	const removed: W[] = [];

	const n = remaining.length;

	const metaData = {
		// check latest and an "average" workflow to get a somewhat accurate representation
		// without counting through the entire history
		workflowSizeScore: metaDataFields?.workflowSizeScore
			? Math.max(
					determineNodeParametersSize(workflows[Math.floor(workflows.length / 2)]),
					determineNodeParametersSize(workflows[workflows.length - 1]),
				)
			: undefined,
	} satisfies DiffMetaData;

	diffLoop: for (let i = n - 1; i > 0; --i) {
		const wcs = new WorkflowChangeSet(remaining[i - 1], remaining[i]);

		for (const shouldSkip of skipRules) {
			if (shouldSkip(remaining[i - 1], remaining[i], wcs, metaData)) continue diffLoop;
		}
		for (const rule of rules) {
			const shouldMerge = rule(remaining[i - 1], remaining[i], wcs, metaData);
			if (shouldMerge) {
				const left = remaining.splice(i - 1, 1)[0];
				removed.push(left);
				break;
			}
		}
	}

	return { removed, remaining };
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
