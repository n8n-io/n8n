import {
	getInteriorEntryNodes,
	getInteriorExitNodes,
	getInteriorNodes,
	isGroupNode,
} from './group-node';
import { NodeConnectionTypes, type IConnection, type IConnections, type INode } from './interfaces';

/**
 * Rewrites an authored graph into the graph the engine runs.
 *
 * Group nodes mark a boundary; they are not steps in a run. This turns every
 * edge that touches a group into edges between runnable nodes:
 *
 * | authored                    | executed                          |
 * |-----------------------------|-----------------------------------|
 * | `A -> group G`              | `A -> every entry node of G`      |
 * | `group G -> B`              | `every exit node of G -> B`       |
 * | `A -> empty group G -> B`   | `A -> B`                          |
 *
 * The rewrite is idempotent and transitive, so a group whose entry node is
 * itself a group resolves through both boundaries. Nesting needs no extra code.
 *
 * The engine reads only the rewritten graph, so the runner, webhooks, workers,
 * sub-workflows, partial runs, and expression resolution all inherit the
 * boundary behaviour without a change of their own.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */

/** Guards a malformed workflow whose groups point at each other in a loop. */
const MAX_BOUNDARY_DEPTH = 100;

type ResolveContext = {
	nodes: INode[];
	connections: IConnections;
	groupsByName: Map<string, INode>;
};

/**
 * Every runnable node an item entering `target` reaches.
 *
 * When `target` is not a group, that is `target` itself. When it is a group,
 * it is the group's entry nodes, resolved through any group among them. When
 * the group is empty, the items skip it and continue to whatever the group's
 * own output feeds — the pass-through case.
 */
function resolveInboundTargets(
	context: ResolveContext,
	target: IConnection,
	depth: number,
	visited: Set<string>,
): IConnection[] {
	const group = context.groupsByName.get(target.node);
	if (group === undefined) return [target];

	if (depth >= MAX_BOUNDARY_DEPTH || visited.has(target.node)) return [];
	const nextVisited = new Set(visited).add(target.node);

	const entries = getInteriorEntryNodes(context.nodes, context.connections, group.id);

	if (entries.length === 0) {
		// Empty group: forward to whatever this group's output feeds. When the
		// group is itself an interior node, its parent's output continues the
		// chain, so a nested empty group still passes through.
		const own = resolveGroupOutputTargets(context, group, depth + 1, nextVisited);
		if (own.length > 0 || group.parentId === undefined) return own;

		const parent = context.nodes.find((node) => node.id === group.parentId);
		if (parent === undefined || !isGroupNode(parent)) return own;

		return resolveGroupOutputTargets(context, parent, depth + 1, nextVisited);
	}

	return entries.flatMap((entry) =>
		resolveInboundTargets(
			context,
			{ ...target, node: entry.name, index: 0 },
			depth + 1,
			nextVisited,
		),
	);
}

/** The runnable targets fed by a group's own main output. */
function resolveGroupOutputTargets(
	context: ResolveContext,
	group: INode,
	depth: number,
	visited: Set<string>,
): IConnection[] {
	const outputs = context.connections[group.name]?.[NodeConnectionTypes.Main] ?? [];

	return outputs
		.flat()
		.filter((connection): connection is IConnection => connection !== null)
		.flatMap((connection) => resolveInboundTargets(context, connection, depth, visited));
}

/**
 * The runnable nodes that emit on behalf of `sourceName`.
 *
 * For an ordinary node that is the node itself. For a group it is the group's
 * exit nodes, whose items concatenate onto the group's output. For an empty
 * group it is whatever feeds the group's input, so the items pass through.
 */
function resolveOutboundSources(
	context: ResolveContext,
	sourceName: string,
	depth: number,
	visited: Set<string>,
): string[] {
	const group = context.groupsByName.get(sourceName);
	if (group === undefined) return [sourceName];

	if (depth >= MAX_BOUNDARY_DEPTH || visited.has(sourceName)) return [];
	const nextVisited = new Set(visited).add(sourceName);

	const exits = getInteriorExitNodes(context.nodes, context.connections, group.id);

	if (exits.length === 0) {
		// Empty group: the sources are whatever feeds the group's input.
		return feedersOf(context, sourceName).flatMap((feeder) =>
			resolveOutboundSources(context, feeder, depth + 1, nextVisited),
		);
	}

	return exits.flatMap((exit) =>
		resolveOutboundSources(context, exit.name, depth + 1, nextVisited),
	);
}

/** Names of nodes with a main connection into `targetName`. */
function feedersOf(context: ResolveContext, targetName: string): string[] {
	const feeders: string[] = [];

	for (const [from, outputs] of Object.entries(context.connections)) {
		for (const targets of outputs[NodeConnectionTypes.Main] ?? []) {
			for (const connection of targets ?? []) {
				if (connection.node === targetName) feeders.push(from);
			}
		}
	}

	return feeders;
}

function addConnection(
	into: IConnections,
	sourceName: string,
	outputIndex: number,
	connection: IConnection,
): void {
	const bySource = (into[sourceName] ??= {});
	const byType = (bySource[NodeConnectionTypes.Main] ??= []);
	while (byType.length <= outputIndex) byType.push([]);

	const slot = (byType[outputIndex] ??= []);
	const duplicate = slot.some(
		(existing) =>
			existing.node === connection.node &&
			existing.type === connection.type &&
			existing.index === connection.index,
	);
	if (!duplicate) slot.push(connection);
}

/**
 * True when the workflow holds at least one group node, so callers can skip the
 * rewrite entirely on the overwhelmingly common ungrouped workflow.
 */
export function hasGroupNodes(nodes: INode[]): boolean {
	return nodes.some(isGroupNode);
}

/** The nodes the engine runs: the authored nodes less the group boundaries. */
export function getRunnableNodes(nodes: INode[]): INode[] {
	return nodes.filter((node) => !isGroupNode(node));
}

/**
 * The connections the engine runs, with every group boundary resolved.
 *
 * Non-main connection types are copied through untouched: a model, tool, or
 * memory connection must not cross a group boundary, which the validation
 * enforces, so there is nothing to resolve for them.
 */
export function resolveGroupConnections(nodes: INode[], connections: IConnections): IConnections {
	if (!hasGroupNodes(nodes)) return connections;

	const groupsByName = new Map(nodes.filter(isGroupNode).map((node) => [node.name, node]));
	const context: ResolveContext = { nodes, connections, groupsByName };
	const resolved: IConnections = {};

	for (const [sourceName, outputs] of Object.entries(connections)) {
		for (const [type, outputSlots] of Object.entries(outputs)) {
			if (type !== NodeConnectionTypes.Main) {
				// Copied through: these never cross a boundary.
				(resolved[sourceName] ??= {})[type] = outputSlots;
				continue;
			}

			outputSlots.forEach((targets, outputIndex) => {
				for (const target of targets ?? []) {
					const runnableTargets = resolveInboundTargets(context, target, 0, new Set());
					if (runnableTargets.length === 0) continue;

					for (const runnableSource of resolveOutboundSources(context, sourceName, 0, new Set())) {
						// A group's exits emit on their own output 0, not on the
						// group's output index.
						const index = groupsByName.has(sourceName) ? 0 : outputIndex;
						for (const runnableTarget of runnableTargets) {
							addConnection(resolved, runnableSource, index, runnableTarget);
						}
					}
				}
			});
		}
	}

	return resolved;
}

/**
 * Interior entry nodes for each group, for the canvas to fan a boundary edge
 * to the nodes it really reaches.
 */
export function getGroupEntryMap(nodes: INode[], connections: IConnections): Map<string, string[]> {
	const map = new Map<string, string[]>();

	for (const group of nodes.filter(isGroupNode)) {
		map.set(
			group.id,
			getInteriorEntryNodes(nodes, connections, group.id).map((node) => node.name),
		);
	}

	return map;
}

/** True when no node names this group as its parent. */
export function isEmptyGroup(nodes: INode[], groupId: string): boolean {
	return getInteriorNodes(nodes, groupId).length === 0;
}
