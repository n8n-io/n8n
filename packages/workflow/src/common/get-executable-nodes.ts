import { getChildNodes } from './get-child-nodes';
import { getParentNodes } from './get-parent-nodes';
import { NodeConnectionTypes } from '../interfaces';
import type { IConnections } from '../interfaces';

/**
 * Names of every node that can run when execution starts at `startNodeName`,
 * including the start node itself.
 *
 * This is the forward `main` closure of the start node, plus the sub-nodes
 * (tool / language model / memory, etc.) attached to any node in that closure.
 * Sub-nodes are wired in the opposite direction — the sub-node is the source of
 * an `ai_*` connection whose destination is its parent — so a plain forward walk
 * misses them; we pick them up by walking `ALL_NON_MAIN` connections backwards
 * from each reachable node. Nodes not reachable from the start node (a disjoint
 * branch, a second trigger's chain) are excluded, since they never execute on
 * this run.
 *
 * @param connectionsBySourceNode  connections indexed by source (Workflow.connectionsBySourceNode)
 * @param connectionsByDestinationNode  connections indexed by destination (Workflow.connectionsByDestinationNode)
 * @param startNodeName  the node execution starts from (the active trigger)
 */
export function getExecutableNodeNames(
	connectionsBySourceNode: IConnections,
	connectionsByDestinationNode: IConnections,
	startNodeName: string,
): Set<string> {
	const reachable = new Set<string>([startNodeName]);

	// Forward walk follows `main` only. A sub-node wired into a reachable node is its
	// source over an `ai_*` connection, so walking 'ALL' forward here would also cross
	// that edge backwards and pull in the sub-node's own (possibly unreachable) parent.
	// The reverse ALL_NON_MAIN pass below is what attaches sub-nodes, correctly.
	for (const node of getChildNodes(
		connectionsBySourceNode,
		startNodeName,
		NodeConnectionTypes.Main,
	)) {
		reachable.add(node);
	}

	// Pull in sub-nodes of every main-reachable node. Iterate a snapshot: sub-nodes
	// can themselves have sub-nodes (a tool with its own model), and getParentNodes
	// already follows those chains transitively, so one pass over the snapshot is enough.
	for (const node of [...reachable]) {
		for (const subNode of getParentNodes(connectionsByDestinationNode, node, 'ALL_NON_MAIN')) {
			reachable.add(subNode);
		}
	}

	return reachable;
}
