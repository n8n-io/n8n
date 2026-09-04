import { GROUP_NODE_TYPE } from './constants';
import { NodeConnectionTypes, type IConnections, type INode } from './interfaces';

/**
 * The boundary semantics of a group node, defined once.
 *
 * A group is a node with one main input and one main output. Its interior is
 * flat: every node whose `parentId` is the group's id. The group node itself
 * never runs; it marks a boundary.
 *
 * Two rules cross the boundary:
 * - fan-in: one group input broadcasts to every interior entry node.
 * - collect: every interior exit node concatenates onto the group output.
 *
 * An empty group forwards its input unchanged.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */

export function isGroupNode(node: Pick<INode, 'type'>): boolean {
	return node.type === GROUP_NODE_TYPE;
}

/** Nodes whose `parentId` names this group. Empty when the group is empty. */
export function getInteriorNodes<TNode extends Pick<INode, 'parentId'>>(
	nodes: TNode[],
	groupId: string,
): TNode[] {
	return nodes.filter((node) => node.parentId === groupId);
}

/**
 * Walks `parentId` upward and reports whether the chain terminates.
 *
 * A chain that revisits a node is a cycle, which the validation rejects. A
 * chain that names a missing node is reported as `unknownParent` so the caller
 * can decide whether that is fatal.
 */
export function resolveParentChain(
	nodesById: Map<string, Pick<INode, 'id' | 'parentId'>>,
	nodeId: string,
): { ancestors: string[]; cycle: boolean; unknownParent?: string } {
	const ancestors: string[] = [];
	const seen = new Set<string>([nodeId]);
	let current = nodesById.get(nodeId)?.parentId;

	while (current !== undefined) {
		if (seen.has(current)) return { ancestors, cycle: true };
		seen.add(current);

		const parent = nodesById.get(current);
		if (parent === undefined) return { ancestors, cycle: false, unknownParent: current };

		ancestors.push(current);
		current = parent.parentId;
	}

	return { ancestors, cycle: false };
}

/** True when `groupId` is `nodeId` itself or one of its ancestors. */
export function isInsideGroup(
	nodesById: Map<string, Pick<INode, 'id' | 'parentId'>>,
	nodeId: string,
	groupId: string,
): boolean {
	if (nodeId === groupId) return true;
	return resolveParentChain(nodesById, nodeId).ancestors.includes(groupId);
}

type MainEdge = { from: string; to: string };

/** Main-type edges of the authored graph, keyed by node name. */
function mainEdges(connections: IConnections): MainEdge[] {
	const edges: MainEdge[] = [];

	for (const [from, outputs] of Object.entries(connections)) {
		for (const targets of outputs[NodeConnectionTypes.Main] ?? []) {
			for (const target of targets ?? []) {
				edges.push({ from, to: target.node });
			}
		}
	}

	return edges;
}

/**
 * The interior entry nodes of a group: interior nodes with no incoming main
 * connection from a sibling in the same group.
 *
 * A trigger in a group is an entry node like any other. The group's input
 * broadcasts to every node this returns.
 */
export function getInteriorEntryNodes(
	nodes: INode[],
	connections: IConnections,
	groupId: string,
): INode[] {
	const interior = getInteriorNodes(nodes, groupId);
	const interiorNames = new Set(interior.map((node) => node.name));
	const fedFromInside = new Set(
		mainEdges(connections)
			.filter((edge) => interiorNames.has(edge.from) && interiorNames.has(edge.to))
			.map((edge) => edge.to),
	);

	return interior.filter((node) => !fedFromInside.has(node.name));
}

/**
 * The interior exit nodes of a group: interior nodes with no outgoing main
 * connection to a sibling in the same group.
 *
 * Their items concatenate onto the group's output.
 */
export function getInteriorExitNodes(
	nodes: INode[],
	connections: IConnections,
	groupId: string,
): INode[] {
	const interior = getInteriorNodes(nodes, groupId);
	const interiorNames = new Set(interior.map((node) => node.name));
	const feedsInside = new Set(
		mainEdges(connections)
			.filter((edge) => interiorNames.has(edge.from) && interiorNames.has(edge.to))
			.map((edge) => edge.from),
	);

	return interior.filter((node) => !feedsInside.has(node.name));
}
