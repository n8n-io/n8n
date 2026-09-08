import { GROUP_NODE_TYPE } from './constants';
import { isGroupNode } from './group-node';
import { normalizeGroupDescription } from './node-grouping-validation';
import {
	NodeConnectionTypes,
	type IConnection,
	type IConnections,
	type INode,
	type IWorkflowGroup,
} from './interfaces';

/**
 * Converts between the two group models.
 *
 * Forward (`nodeGroups` -> group nodes) is what an existing workflow needs. It
 * must round-trip: a converted workflow renders and executes the same. It must
 * never drop a group, because a dropped group loses the user's work.
 *
 * Reverse (group nodes -> `nodeGroups`) exists for a downgrade. It is lossy
 * only where the old format cannot express the new one, and the loss is always
 * the grouping, never a node or a connection.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */

/** Height of the group card header, so the group node sits above its members. */
const GROUP_HEADER_OFFSET = 96;

/** Horizontal and vertical padding between the card and the member bounding box. */
const GROUP_PADDING = 32;

export type GroupNodeMigrationResult = {
	nodes: INode[];
	connections: IConnections;
	/** Group ids that were converted, in input order. */
	convertedGroupIds: string[];
	/** Member ids named by a group that the workflow does not have. */
	missingNodeIds: string[];
};

/** Top-left corner for the group node, above and left of its members. */
function groupPosition(members: INode[]): [number, number] {
	if (members.length === 0) return [0, 0];

	const left = Math.min(...members.map((member) => member.position[0]));
	const top = Math.min(...members.map((member) => member.position[1]));

	return [left - GROUP_PADDING, top - GROUP_HEADER_OFFSET];
}

/** A name no other node uses, so the group node can be addressed by name. */
function uniqueName(preferred: string, taken: Set<string>): string {
	if (!taken.has(preferred)) return preferred;

	let suffix = 1;
	while (taken.has(`${preferred} ${suffix}`)) suffix += 1;

	return `${preferred} ${suffix}`;
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
 * Converts every `nodeGroups` entry into a group node plus `parentId` on its
 * members, and re-points every connection that crossed the group boundary from
 * the member onto the group's port.
 *
 * A group whose members are all missing still becomes a group node, as an empty
 * group. Losing it would lose the user's work; an empty group is the safe
 * landing place.
 *
 * `nodeGroups` is left for the caller to keep, so a downgrade still reads it.
 */
export function migrateNodeGroupsToGroupNodes(workflow: {
	nodes: INode[];
	connections: IConnections;
	nodeGroups?: IWorkflowGroup[];
}): GroupNodeMigrationResult {
	const groups = workflow.nodeGroups ?? [];
	if (groups.length === 0) {
		return {
			nodes: workflow.nodes,
			connections: workflow.connections,
			convertedGroupIds: [],
			missingNodeIds: [],
		};
	}

	const nodes = workflow.nodes.map((node) => ({ ...node }));
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const takenNames = new Set(nodes.map((node) => node.name));
	const convertedGroupIds: string[] = [];
	const missingNodeIds: string[] = [];

	// Idempotency guard: a group already converted on an earlier run has a node
	// carrying its id, so converting it again would add a second, empty group.
	// Skip it, and re-point nothing for it, so a second run is a no-op.
	const alreadyConverted = new Set(nodes.filter(isGroupNode).map((node) => node.id));

	/** Group node name for each member name, to re-point that member's edges. */
	const groupNameOfMember = new Map<string, string>();
	const groupNodes: INode[] = [];

	for (const group of groups) {
		if (alreadyConverted.has(group.id)) continue;

		const members = group.nodeIds
			.map((id) => {
				const member = nodesById.get(id);
				if (member === undefined) missingNodeIds.push(id);
				return member;
			})
			.filter((member): member is INode => member !== undefined)
			// A node already inside another group keeps its first group: one
			// innermost group per node.
			.filter((member) => member.parentId === undefined);

		const name = uniqueName(group.name, takenNames);
		takenNames.add(name);

		const groupNode: INode = {
			// The id carries over, so anything that referenced the group still resolves.
			id: group.id,
			name,
			type: GROUP_NODE_TYPE,
			typeVersion: 1,
			position: groupPosition(members),
			parameters: {
				objective: normalizeGroupDescription(group.description) ?? '',
			},
		};

		for (const member of members) {
			member.parentId = group.id;
			groupNameOfMember.set(member.name, name);
		}

		groupNodes.push(groupNode);
		convertedGroupIds.push(group.id);
	}

	// Re-point every boundary-crossing edge onto the group's port. An edge
	// between two members of the same group is left alone.
	const connections: IConnections = {};

	for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
		for (const [type, outputSlots] of Object.entries(outputs)) {
			if (type !== NodeConnectionTypes.Main) {
				// A model, tool, or memory connection must not cross a boundary, so
				// there is nothing to re-point.
				(connections[sourceName] ??= {})[type] = outputSlots;
				continue;
			}

			outputSlots.forEach((targets, outputIndex) => {
				for (const target of targets ?? []) {
					const sourceGroup = groupNameOfMember.get(sourceName);
					const targetGroup = groupNameOfMember.get(target.node);

					// Inside one group: unchanged.
					if (sourceGroup !== undefined && sourceGroup === targetGroup) {
						addConnection(connections, sourceName, outputIndex, target);
						continue;
					}

					const from = sourceGroup ?? sourceName;
					const to = targetGroup ?? target.node;
					addConnection(connections, from, sourceGroup === undefined ? outputIndex : 0, {
						...target,
						node: to,
						index: targetGroup === undefined ? target.index : 0,
					});
				}
			});
		}
	}

	return {
		nodes: [...nodes, ...groupNodes],
		connections,
		convertedGroupIds,
		missingNodeIds,
	};
}

export type GroupNodeReversalResult = {
	nodes: INode[];
	connections: IConnections;
	nodeGroups: IWorkflowGroup[];
	/**
	 * Group ids the old format cannot express, so their members were ungrouped.
	 * The nodes and the connections survive; only the grouping is lost.
	 */
	droppedGroupIds: string[];
};

/**
 * Rebuilds `nodeGroups` from group nodes, for a downgrade.
 *
 * A group the old format cannot express is dropped and its members are
 * ungrouped. That is every group which is empty, holds a trigger, is nested, or
 * has more than one interior entry or exit. The nodes and the connections stay,
 * which is the safe failure.
 */
export function migrateGroupNodesToNodeGroups(workflow: {
	nodes: INode[];
	connections: IConnections;
}): GroupNodeReversalResult {
	const groupNodes = workflow.nodes.filter(isGroupNode);
	if (groupNodes.length === 0) {
		return {
			nodes: workflow.nodes,
			connections: workflow.connections,
			nodeGroups: [],
			droppedGroupIds: [],
		};
	}

	const nodeGroups: IWorkflowGroup[] = [];
	const droppedGroupIds: string[] = [];

	for (const groupNode of groupNodes) {
		const members = workflow.nodes.filter((node) => node.parentId === groupNode.id);
		// The old format has no way to say "empty" and no way to nest.
		const expressible =
			members.length > 0 && groupNode.parentId === undefined && !members.some(isGroupNode);

		if (!expressible) {
			droppedGroupIds.push(groupNode.id);
			continue;
		}

		const description = normalizeGroupDescription(groupNode.parameters.objective);
		nodeGroups.push({
			id: groupNode.id,
			name: groupNode.name,
			nodeIds: members.map((member) => member.id),
			...(description === undefined ? {} : { description }),
		});
	}

	// Re-point each group's boundary edges back onto its interior entry and exit,
	// then drop the group nodes.
	const groupNamesById = new Map(groupNodes.map((node) => [node.id, node.name]));
	const entryOf = new Map<string, string>();
	const exitOf = new Map<string, string>();

	for (const group of nodeGroups) {
		const members = workflow.nodes.filter((node) => node.parentId === group.id);
		const memberNames = new Set(members.map((member) => member.name));
		const fedFromInside = new Set<string>();
		const feedsInside = new Set<string>();

		for (const [from, outputs] of Object.entries(workflow.connections)) {
			for (const targets of outputs[NodeConnectionTypes.Main] ?? []) {
				for (const target of targets ?? []) {
					if (memberNames.has(from) && memberNames.has(target.node)) {
						fedFromInside.add(target.node);
						feedsInside.add(from);
					}
				}
			}
		}

		const entry = members.find((member) => !fedFromInside.has(member.name));
		const exit = members.find((member) => !feedsInside.has(member.name));
		const groupName = groupNamesById.get(group.id);
		if (groupName === undefined) continue;
		if (entry !== undefined) entryOf.set(groupName, entry.name);
		if (exit !== undefined) exitOf.set(groupName, exit.name);
	}

	const connections: IConnections = {};

	for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
		for (const [type, outputSlots] of Object.entries(outputs)) {
			if (type !== NodeConnectionTypes.Main) {
				(connections[sourceName] ??= {})[type] = outputSlots;
				continue;
			}

			outputSlots.forEach((targets, outputIndex) => {
				for (const target of targets ?? []) {
					const from = exitOf.get(sourceName) ?? sourceName;
					const to = entryOf.get(target.node) ?? target.node;
					// An edge to a dropped group has nowhere to land.
					if (groupNamesById.has(from) || groupNamesById.has(to)) continue;

					addConnection(connections, from, outputIndex, { ...target, node: to });
				}
			});
		}
	}

	// The old format carries membership in `nodeGroups`, so no node keeps a
	// `parentId`. A member of a dropped group simply has no group any more.
	const nodes = workflow.nodes
		.filter((node) => !isGroupNode(node))
		.map(({ parentId: _parentId, ...node }) => node);

	return { nodes, connections, nodeGroups, droppedGroupIds };
}
