import { getInteriorNodes, isGroupNode, resolveParentChain } from './group-node';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type INodeTypeDescription,
} from './interfaces';

/**
 * Validation for the group-node model.
 *
 * The old `nodeGroups` model borrowed a member node as the group's connection
 * boundary, which forced three rules: one entry node, one exit node, and no
 * trigger inside a group. A group node owns its ports, so none of the three is
 * needed. `node-grouping-validation.ts` still holds them for the old path.
 *
 * The rules here replace them:
 *
 * 1. Boundary. An interior node connects to a sibling of the same group, or to
 *    the group's own ports. It never connects past the boundary straight to a
 *    node outside the group.
 * 2. `parentId` names a group. The id must belong to a node of type
 *    `n8n-nodes-base.group` in the same workflow.
 * 3. Acyclic. Following `parentId` must terminate. A group cannot contain
 *    itself, directly or through a chain.
 * 4. One innermost group per node. `parentId` holds one value, so this is true
 *    by construction; the check is that the value is a string.
 *
 * The AI sub-node rule stays: a model, tool, or memory connection must not
 * cross a group boundary.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */

export type GroupNodeViolationCode =
	| 'unknown-parent'
	| 'parent-not-a-group'
	| 'parent-cycle'
	| 'invalid-parent-id'
	| 'boundary-crossed'
	| 'non-main-boundary';

export type GroupNodeViolation = {
	code: GroupNodeViolationCode;
	/** Actionable, user-facing description; also the save-path rejection message. */
	message: string;
	/** Name of the node the violation is about. */
	nodeName: string;
};

export type GroupNodeValidationResult =
	| { valid: true }
	| { valid: false; violations: [GroupNodeViolation, ...GroupNodeViolation[]] };

export type GroupNodeValidationInput<TNode extends INode = INode> = {
	nodes: TNode[];
	connectionsBySourceNode?: IConnections;
	/**
	 * Resolves a node to its type description, or `null` for an unknown type so
	 * validation degrades instead of throwing. Pass `null` to skip the checks
	 * that need a type, which keeps a git import from failing on a node type
	 * this instance does not have.
	 */
	getNodeType?: ((node: TNode) => INodeTypeDescription | null | undefined) | null;
};

/**
 * The rules as stated once, so the message a save rejects with and the text an
 * agent reads in the SDK docs cannot drift apart.
 */
export const GROUP_NODE_RULES = {
	boundary: {
		sdkReference:
			'**Connect through the group ports.** A node inside a group connects to other nodes ' +
			'of the same group, or to the group node itself. To reach a node outside the group, ' +
			"connect to the group's own input or output instead of crossing the boundary.",
		violation: 'cannot connect past its group boundary',
	},
	parentIsGroup: {
		sdkReference:
			'**`parentId` names a group node.** The id must belong to a node of type ' +
			'`n8n-nodes-base.group` in the same workflow.',
		violation: 'must name a group node',
	},
	acyclic: {
		sdkReference:
			'**A group cannot contain itself.** Following `parentId` upward must reach a node ' +
			'that has no parent.',
		violation: 'is inside itself',
	},
	nonMainBoundary: {
		sdkReference:
			'**Keep AI sub-nodes with their Agent.** If an AI Agent is in a group, its ' +
			'language-model, tool, and memory sub-nodes belong in the same group. A model, tool, ' +
			'or memory connection must not cross a group boundary.',
		violation: 'cannot cross the',
	},
} as const;

type MainEdge = { from: string; to: string; type: string };

function edgesOf(connections: IConnections): MainEdge[] {
	const edges: MainEdge[] = [];

	for (const [from, outputs] of Object.entries(connections)) {
		for (const [type, slots] of Object.entries(outputs)) {
			for (const targets of slots) {
				for (const target of targets ?? []) {
					edges.push({ from, to: target.node, type });
				}
			}
		}
	}

	return edges;
}

/**
 * Validates the group nodes of a workflow without throwing, collecting every
 * violation. `violations[0]` is the error a save rejects with.
 */
export function validateGroupNodes<TNode extends INode>({
	nodes,
	connectionsBySourceNode,
	getNodeType,
}: GroupNodeValidationInput<TNode>): GroupNodeValidationResult {
	const violations: GroupNodeViolation[] = [];
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));

	// Rules 2, 3 and 4: `parentId` names an existing group, and the chain ends.
	for (const node of nodes) {
		if (node.parentId === undefined) continue;

		if (typeof node.parentId !== 'string' || node.parentId.length === 0) {
			violations.push({
				code: 'invalid-parent-id',
				nodeName: node.name,
				message: `The group of "${node.name}" ${GROUP_NODE_RULES.parentIsGroup.violation}.`,
			});
			continue;
		}

		const parent = nodesById.get(node.parentId);
		if (parent === undefined) {
			violations.push({
				code: 'unknown-parent',
				nodeName: node.name,
				message: `"${node.name}" names a group that does not exist in this workflow.`,
			});
			continue;
		}

		if (!isGroupNode(parent)) {
			violations.push({
				code: 'parent-not-a-group',
				nodeName: node.name,
				message: `The group of "${node.name}" ${GROUP_NODE_RULES.parentIsGroup.violation}, but "${parent.name}" is not one.`,
			});
			continue;
		}

		const chain = resolveParentChain(nodesById, node.id);
		if (chain.cycle) {
			violations.push({
				code: 'parent-cycle',
				nodeName: node.name,
				message: `The group "${node.name}" ${GROUP_NODE_RULES.acyclic.violation}.`,
			});
		}
	}

	// Rule 1 needs the graph. Without it the parent-chain rules above still ran.
	for (const edge of edgesOf(connectionsBySourceNode ?? {})) {
		const from = nodesByName.get(edge.from);
		const to = nodesByName.get(edge.to);
		if (from === undefined || to === undefined) continue;

		const fromGroup = from.parentId;
		const toGroup = to.parentId;
		if (fromGroup === toGroup) continue;

		// An edge to or from the group node itself is the boundary port, which is
		// exactly how the interior is meant to reach the outside.
		if (isGroupNode(to) && to.id === fromGroup) continue;
		if (isGroupNode(from) && from.id === toGroup) continue;

		// A group node's own edges belong to whichever group holds the group node.
		const fromOwner = isGroupNode(from) ? from.parentId : fromGroup;
		const toOwner = isGroupNode(to) ? to.parentId : toGroup;
		if (fromOwner === toOwner) continue;

		if (edge.type !== NodeConnectionTypes.Main) {
			violations.push({
				code: 'non-main-boundary',
				nodeName: from.name,
				message: `A group ${GROUP_NODE_RULES.nonMainBoundary.violation} "${edge.type}" connection between "${edge.from}" and "${edge.to}".`,
			});
			continue;
		}

		violations.push({
			code: 'boundary-crossed',
			nodeName: from.name,
			message: `"${edge.from}" ${GROUP_NODE_RULES.boundary.violation}: connect to the group instead of "${edge.to}".`,
		});
	}

	// `getNodeType` is accepted for parity with the old validator and for the
	// checks a later rule may need. No current rule reads a node type: a trigger
	// inside a group is an ordinary interior node now.
	void getNodeType;

	const [first, ...rest] = violations;
	return first === undefined ? { valid: true } : { valid: false, violations: [first, ...rest] };
}

/**
 * Interior nodes of every group, keyed by group id. A group with no entry here
 * is empty.
 */
export function getGroupInteriors(nodes: INode[]): Map<string, INode[]> {
	const interiors = new Map<string, INode[]>();

	for (const group of nodes.filter(isGroupNode)) {
		interiors.set(group.id, getInteriorNodes(nodes, group.id));
	}

	return interiors;
}
