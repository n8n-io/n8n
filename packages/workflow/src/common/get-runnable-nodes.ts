import { getExecutableNodeNames } from './get-executable-nodes';
import type { IConnections, INode } from '../interfaces';

/**
 * Which nodes a run can actually involve.
 *
 * Publishing is gated on this in two places that must agree: the server refuses
 * activation over a node that would break a run, and the editor greys out the
 * Publish button for the same reason. A node no run can reach cannot break one,
 * so neither surface may block on it.
 */

/** Nodes a node feeds directly, by name, in graph order. */
function consumerNames(nodeName: string, connections: IConnections): string[] {
	const names: string[] = [];

	for (const targetsByOutput of Object.values(connections[nodeName] ?? {})) {
		for (const targets of targetsByOutput ?? []) {
			for (const target of targets ?? []) {
				names.push(target.node);
			}
		}
	}

	return names;
}

/**
 * Names of every node some trigger can reach, following the same rules the
 * engine uses: the forward `main` closure of each enabled trigger, plus the
 * sub-nodes hanging off anything in it.
 *
 * Disabled nodes are walked through rather than stopped at, because a disabled
 * node passes its items downstream, so what follows one still runs.
 *
 * @param isTriggerLike decides what starts a run. The server reads the node
 * type's implementation, the editor only has the description, so each caller
 * supplies its own.
 */
export function getReachableNodeNames(
	nodes: INode[],
	connectionsBySourceNode: IConnections,
	connectionsByDestinationNode: IConnections,
	isTriggerLike: (node: INode) => boolean,
): Set<string> {
	const reachable = new Set<string>();

	for (const node of nodes) {
		if (node.disabled) continue;
		if (!isTriggerLike(node)) continue;

		for (const name of getExecutableNodeNames(
			connectionsBySourceNode,
			connectionsByDestinationNode,
			node.name,
		)) {
			reachable.add(name);
		}
	}

	return reachable;
}

/**
 * Whether nothing will ever ask this node for its inputs, because every chain
 * of consumers out of it is disabled. Only ever true for supply-type nodes (LLM
 * models, parsers, memory, tools): anything that can produce a `main` output
 * belongs to the flow and runs regardless of what its consumers do.
 *
 * Consumers are followed transitively. A model feeding a parser feeding a
 * disabled agent is as inert as one feeding the disabled agent directly, and
 * stopping at the first hop would refuse to publish over it.
 *
 * `canOutputMain` reads the type's declared outputs rather than the
 * connections, since an unwired `main` output is still a main-path node. It must
 * answer `true` when unsure, so a half-built graph does not silently opt out of
 * the check.
 */
export function onlySuppliesDisabledNodes(
	node: INode,
	connections: IConnections,
	nodes: INode[],
	canOutputMain: (node: INode) => boolean,
): boolean {
	if (canOutputMain(node)) return false;

	const nodeByName = new Map(nodes.map((n) => [n.name, n]));
	// Doubles as cycle protection and keeps this linear over the sub-graph.
	const visited = new Set<string>();

	/** Whether anything that actually runs asks `nodeName` for its output. */
	function isAsked(nodeName: string): boolean {
		if (visited.has(nodeName)) return false;
		visited.add(nodeName);

		for (const consumerName of consumerNames(nodeName, connections)) {
			const consumer = nodeByName.get(consumerName);
			// An unknown target is treated as live.
			if (!consumer) return true;
			if (consumer.disabled) continue;
			// A consumer on the main path runs, so it will ask. A supply consumer is
			// itself only asked by its own consumers.
			if (canOutputMain(consumer) || isAsked(consumer.name)) return true;
		}

		return false;
	}

	// A supply node wired to nothing is left to the reachability check, which
	// skips it anyway, rather than exempted here.
	if (consumerNames(node.name, connections).length === 0) return false;

	return !isAsked(node.name);
}
