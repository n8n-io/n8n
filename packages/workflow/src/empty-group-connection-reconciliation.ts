import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type IWorkflowGroup,
	type IWorkflowGroupVisualLink,
	type IWorkflowGroupVisualLinkEndpoint,
	type IWorkflowGroupVisualLinkNodeEndpoint,
	type NodeConnectionType,
} from './interfaces';
import { deepCopy } from './utils';

export type EmptyGroupConnectionIssueCode =
	| 'ambiguous-node-id'
	| 'ambiguous-node-name'
	| 'canonical-connection-collision'
	| 'duplicate-group-id'
	| 'duplicate-projected-connection'
	| 'duplicate-visual-link'
	| 'empty-group-cycle'
	| 'invalid-empty-group-frame'
	| 'invalid-visual-link-owner'
	| 'missing-projected-connection'
	| 'non-empty-group-data'
	| 'projected-connection-multiplicity'
	| 'unknown-group-endpoint'
	| 'unknown-node-endpoint'
	| 'unsupported-node-name'
	| 'unsupported-visual-link'
	| 'visual-link-to-non-empty-group';

export interface EmptyGroupConnectionIssue {
	code: EmptyGroupConnectionIssueCode;
	message: string;
	groupId?: string;
}

/**
 * The complete identity of one executable connection occurrence.
 *
 * `IConnections` stores the first three fields in its nested keys and the last
 * three in the connection value. Keeping all six fields prevents two ports on
 * the same pair of nodes from being treated as one connection.
 */
export interface EmptyGroupCanonicalConnection {
	sourceNode: string;
	sourceType: NodeConnectionType;
	sourceIndex: number;
	targetNode: string;
	targetType: NodeConnectionType;
	targetIndex: number;
}

export type EmptyGroupProjectionResult =
	| { success: true; projection: EmptyGroupCanonicalConnection[] }
	| { success: false; issues: [EmptyGroupConnectionIssue, ...EmptyGroupConnectionIssue[]] };

export interface ReconcileEmptyGroupConnectionsInput {
	nodes: INode[];
	connections: IConnections;
	previousNodeGroups: IWorkflowGroup[];
	nextNodeGroups: IWorkflowGroup[];
}

export interface ValidateEmptyGroupConnectionStateInput {
	nodes: INode[];
	connections: IConnections;
	nodeGroups: IWorkflowGroup[];
}

export type ReconcileEmptyGroupConnectionsResult =
	| {
			success: true;
			value: { nodeGroups: IWorkflowGroup[]; connections: IConnections };
			projection: {
				previous: EmptyGroupCanonicalConnection[];
				next: EmptyGroupCanonicalConnection[];
				added: EmptyGroupCanonicalConnection[];
				removed: EmptyGroupCanonicalConnection[];
			};
	  }
	| { success: false; issues: [EmptyGroupConnectionIssue, ...EmptyGroupConnectionIssue[]] };

type PreparedVisualLink = {
	ownerGroupId: string;
	link: IWorkflowGroupVisualLink;
};

type ProjectionContext = {
	nodesById: Map<string, INode>;
	emptyGroups: IWorkflowGroup[];
	links: PreparedVisualLink[];
};

type SourceRoute = {
	endpoint: IWorkflowGroupVisualLinkNodeEndpoint;
	pathCount: number;
};

const prototypeShadowingNodeNames = new Set(
	[...Object.getOwnPropertyNames(Object.prototype), 'prototype'].map((name) => name.toLowerCase()),
);

type DerivedEmptyGroupProjection =
	| {
			success: true;
			projection: EmptyGroupCanonicalConnection[];
			ownerGroupIdByConnectionKey: Map<string, string>;
	  }
	| { success: false; issues: [EmptyGroupConnectionIssue, ...EmptyGroupConnectionIssue[]] };

const issue = (
	code: EmptyGroupConnectionIssueCode,
	message: string,
	groupId?: string,
): EmptyGroupConnectionIssue => ({ code, message, ...(groupId ? { groupId } : {}) });

function failure(
	first: EmptyGroupConnectionIssue,
	...rest: EmptyGroupConnectionIssue[]
): { success: false; issues: [EmptyGroupConnectionIssue, ...EmptyGroupConnectionIssue[]] } {
	return { success: false, issues: [first, ...rest] };
}

function endpointKey(endpoint: IWorkflowGroupVisualLinkEndpoint): string {
	return JSON.stringify([endpoint.kind, endpoint.id, endpoint.port.type, endpoint.port.index]);
}

function visualLinkKey(link: IWorkflowGroupVisualLink): string {
	return JSON.stringify([endpointKey(link.source), endpointKey(link.target)]);
}

function canonicalConnectionKey(connection: EmptyGroupCanonicalConnection): string {
	return JSON.stringify([
		connection.sourceNode,
		connection.sourceType,
		connection.sourceIndex,
		connection.targetNode,
		connection.targetType,
		connection.targetIndex,
	]);
}

function isFinitePair(value: unknown): value is [number, number] {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		value.every((part) => typeof part === 'number' && Number.isFinite(part))
	);
}

function hasValidFrame(group: IWorkflowGroup): boolean {
	const frame: unknown = group.frame;
	return (
		isRecord(frame) &&
		isFinitePair(frame.position) &&
		isFinitePair(frame.size) &&
		frame.size.every((part) => part > 0)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseVisualLinkEndpoint(value: unknown): IWorkflowGroupVisualLinkEndpoint | undefined {
	if (!isRecord(value) || (value.kind !== 'node' && value.kind !== 'group')) return undefined;
	if (typeof value.id !== 'string' || value.id.length === 0 || !isRecord(value.port)) {
		return undefined;
	}
	if (value.port.type !== NodeConnectionTypes.Main) return undefined;
	if (
		typeof value.port.index !== 'number' ||
		!Number.isInteger(value.port.index) ||
		value.port.index < 0
	) {
		return undefined;
	}
	if (value.kind === 'group') {
		if (value.port.index !== 0) return undefined;
		return { kind: 'group', id: value.id, port: { type: NodeConnectionTypes.Main, index: 0 } };
	}
	return {
		kind: 'node',
		id: value.id,
		port: { type: NodeConnectionTypes.Main, index: value.port.index },
	};
}

function parseVisualLink(value: unknown): IWorkflowGroupVisualLink | undefined {
	if (!isRecord(value)) return undefined;
	const source = parseVisualLinkEndpoint(value.source);
	const target = parseVisualLinkEndpoint(value.target);
	return source && target ? { source, target } : undefined;
}

function expectedOwnerGroupId(link: IWorkflowGroupVisualLink): string | undefined {
	if (link.source.kind === 'group') return link.source.id;
	if (link.target.kind === 'group') return link.target.id;
	return undefined;
}

function validateEndpointReference(
	endpoint: IWorkflowGroupVisualLinkEndpoint,
	owner: IWorkflowGroup,
	nodesById: Map<string, INode>,
	groupsById: Map<string, IWorkflowGroup>,
): EmptyGroupConnectionIssue | undefined {
	if (endpoint.kind === 'node') {
		const node = nodesById.get(endpoint.id);
		if (!node) {
			return issue(
				'unknown-node-endpoint',
				`Visual link references unknown node "${endpoint.id}".`,
				owner.id,
			);
		}
		return prototypeShadowingNodeNames.has(node.name.toLowerCase())
			? issue(
					'unsupported-node-name',
					`Visual links cannot reference node "${node.name}" because its name shadows an object prototype property.`,
					owner.id,
				)
			: undefined;
	}

	const group = groupsById.get(endpoint.id);
	if (!group) {
		return issue(
			'unknown-group-endpoint',
			`Visual link references unknown group "${endpoint.id}".`,
			owner.id,
		);
	}
	return group.nodeIds.length > 0
		? issue(
				'visual-link-to-non-empty-group',
				`Visual link references non-empty group "${endpoint.id}".`,
				owner.id,
			)
		: undefined;
}

function prepareVisualLinks(
	nodeGroups: IWorkflowGroup[],
	nodesById: Map<string, INode>,
	groupsById: Map<string, IWorkflowGroup>,
) {
	const issues: EmptyGroupConnectionIssue[] = [];
	const links: PreparedVisualLink[] = [];
	const seenLinks = new Set<string>();
	for (const owner of nodeGroups) {
		if (owner.visualLinks !== undefined && !Array.isArray(owner.visualLinks)) {
			issues.push(
				issue(
					'unsupported-visual-link',
					`Group "${owner.name}" has malformed visual-link data.`,
					owner.id,
				),
			);
			continue;
		}
		for (const candidate of owner.visualLinks ?? []) {
			const link = parseVisualLink(candidate);
			if (!link) {
				issues.push(
					issue(
						'unsupported-visual-link',
						`Group "${owner.name}" contains a malformed or unsupported visual link.`,
						owner.id,
					),
				);
				continue;
			}
			const key = visualLinkKey(link);
			if (seenLinks.has(key)) {
				issues.push(
					issue('duplicate-visual-link', `Visual link ${key} is stored more than once.`, owner.id),
				);
			} else {
				seenLinks.add(key);
			}

			const expectedOwner = expectedOwnerGroupId(link);
			if (expectedOwner === undefined) {
				issues.push(
					issue(
						'unsupported-visual-link',
						`Visual link ${key} must have at least one empty-group endpoint.`,
						owner.id,
					),
				);
			} else if (expectedOwner !== owner.id) {
				issues.push(
					issue(
						'invalid-visual-link-owner',
						`Visual link ${key} must be stored by group "${expectedOwner}", not "${owner.id}".`,
						owner.id,
					),
				);
			}

			for (const endpoint of [link.source, link.target]) {
				const endpointIssue = validateEndpointReference(endpoint, owner, nodesById, groupsById);
				if (endpointIssue) issues.push(endpointIssue);
			}
			links.push({ ownerGroupId: owner.id, link });
		}
	}
	return { issues, links };
}

function prepareProjectionContext(
	nodes: INode[],
	nodeGroups: IWorkflowGroup[],
): ProjectionContext | { issues: [EmptyGroupConnectionIssue, ...EmptyGroupConnectionIssue[]] } {
	const issues: EmptyGroupConnectionIssue[] = [];
	const nodesById = new Map<string, INode>();
	const nodeNames = new Set<string>();

	for (const node of nodes) {
		if (nodesById.has(node.id)) {
			issues.push(issue('ambiguous-node-id', `Node ID "${node.id}" is not unique.`));
		} else {
			nodesById.set(node.id, node);
		}
		if (nodeNames.has(node.name)) {
			issues.push(issue('ambiguous-node-name', `Node name "${node.name}" is not unique.`));
		} else {
			nodeNames.add(node.name);
		}
	}

	const groupsById = new Map<string, IWorkflowGroup>();
	const emptyGroups: IWorkflowGroup[] = [];
	for (const group of nodeGroups) {
		if (groupsById.has(group.id)) {
			issues.push(issue('duplicate-group-id', `Group ID "${group.id}" is not unique.`, group.id));
		} else {
			groupsById.set(group.id, group);
		}

		if (group.nodeIds.length === 0) {
			emptyGroups.push(group);
			if (!hasValidFrame(group)) {
				issues.push(
					issue(
						'invalid-empty-group-frame',
						`Empty group "${group.name}" must have a finite position and positive finite size.`,
						group.id,
					),
				);
			}
		} else if (group.frame !== undefined || group.visualLinks !== undefined) {
			issues.push(
				issue(
					'non-empty-group-data',
					`Non-empty group "${group.name}" must not retain empty-group frame or visual-link data.`,
					group.id,
				),
			);
		}
	}

	const preparedLinks = prepareVisualLinks(nodeGroups, nodesById, groupsById);
	issues.push(...preparedLinks.issues);

	const [firstIssue, ...restIssues] = issues;
	if (firstIssue) return { issues: [firstIssue, ...restIssues] };
	return { nodesById, emptyGroups, links: preparedLinks.links };
}

function sourceRouteKey(endpoint: IWorkflowGroupVisualLinkNodeEndpoint): string {
	return JSON.stringify([endpoint.id, endpoint.port.type, endpoint.port.index]);
}

function addSourceRoute(
	routesByGroup: Map<string, Map<string, SourceRoute>>,
	groupId: string,
	endpoint: IWorkflowGroupVisualLinkNodeEndpoint,
	pathCount: number,
) {
	let routes = routesByGroup.get(groupId);
	if (!routes) {
		routes = new Map();
		routesByGroup.set(groupId, routes);
	}
	const key = sourceRouteKey(endpoint);
	const current = routes.get(key);
	routes.set(key, {
		endpoint,
		pathCount: Math.min(2, (current?.pathCount ?? 0) + pathCount),
	});
}

type ProjectionGraph = {
	outgoingByGroup: Map<string, IWorkflowGroupVisualLink[]>;
	indegree: Map<string, number>;
	routesByGroup: Map<string, Map<string, SourceRoute>>;
};

function findVertexInCycle(
	adjacency: Map<string, Set<string>>,
	isReportable: (vertex: string) => boolean,
): string | undefined {
	const state = new Map<string, 'active' | 'complete'>();
	const activePath: string[] = [];
	const activePathIndexes = new Map<string, number>();
	type TraversalFrame = { vertex: string; targets: string[]; nextTargetIndex: number };
	const vertices = new Set([
		...adjacency.keys(),
		...[...adjacency.values()].flatMap((targets) => [...targets]),
	]);

	for (const start of vertices) {
		if (state.has(start)) continue;
		state.set(start, 'active');
		activePathIndexes.set(start, activePath.length);
		activePath.push(start);
		const traversal: TraversalFrame[] = [
			{ vertex: start, targets: [...(adjacency.get(start) ?? [])], nextTargetIndex: 0 },
		];

		while (traversal.length > 0) {
			const frame = traversal[traversal.length - 1];
			if (frame.nextTargetIndex >= frame.targets.length) {
				traversal.pop();
				activePath.pop();
				activePathIndexes.delete(frame.vertex);
				state.set(frame.vertex, 'complete');
				continue;
			}

			const target = frame.targets[frame.nextTargetIndex++];
			const targetState = state.get(target);
			if (!targetState) {
				state.set(target, 'active');
				activePathIndexes.set(target, activePath.length);
				activePath.push(target);
				traversal.push({
					vertex: target,
					targets: [...(adjacency.get(target) ?? [])],
					nextTargetIndex: 0,
				});
				continue;
			}

			if (targetState === 'active') {
				const cycleStart = activePathIndexes.get(target) ?? activePath.length;
				const reportableVertex = activePath.slice(cycleStart).find(isReportable);
				if (reportableVertex) return reportableVertex;
			}
		}
	}

	return undefined;
}

function findEmptyGroupCycleMember(
	groupIds: Set<string>,
	outgoingByGroup: Map<string, IWorkflowGroupVisualLink[]>,
): string | undefined {
	const adjacency = new Map<string, Set<string>>();
	for (const groupId of groupIds) {
		for (const { target } of outgoingByGroup.get(groupId) ?? []) {
			if (target.kind === 'group' && groupIds.has(target.id)) {
				addGraphEdge(adjacency, groupId, target.id);
			}
		}
	}
	return findVertexInCycle(adjacency, (vertex) => groupIds.has(vertex));
}

function buildProjectionGraph(
	emptyGroups: IWorkflowGroup[],
	links: PreparedVisualLink[],
): ProjectionGraph {
	const outgoingByGroup = new Map<string, IWorkflowGroupVisualLink[]>();
	const indegree = new Map(emptyGroups.map((group) => [group.id, 0]));
	const routesByGroup = new Map<string, Map<string, SourceRoute>>();

	for (const { link } of links) {
		if (link.source.kind === 'node') {
			if (link.target.kind === 'group') {
				addSourceRoute(routesByGroup, link.target.id, link.source, 1);
			}
			continue;
		}

		const outgoing = outgoingByGroup.get(link.source.id);
		if (outgoing) outgoing.push(link);
		else outgoingByGroup.set(link.source.id, [link]);

		if (link.target.kind === 'group') {
			indegree.set(link.target.id, (indegree.get(link.target.id) ?? 0) + 1);
		}
	}

	return { outgoingByGroup, indegree, routesByGroup };
}

function orderEmptyGroups(
	emptyGroups: IWorkflowGroup[],
	graph: Pick<ProjectionGraph, 'indegree' | 'outgoingByGroup'>,
): { orderedGroupIds: string[] } | { cycleGroupId: string } {
	const ready = emptyGroups
		.filter((group) => (graph.indegree.get(group.id) ?? 0) === 0)
		.map((group) => group.id);
	const orderedGroupIds: string[] = [];
	for (let index = 0; index < ready.length; index++) {
		const groupId = ready[index];
		orderedGroupIds.push(groupId);
		for (const link of graph.outgoingByGroup.get(groupId) ?? []) {
			if (link.target.kind !== 'group') continue;
			const nextIndegree = (graph.indegree.get(link.target.id) ?? 0) - 1;
			graph.indegree.set(link.target.id, nextIndegree);
			if (nextIndegree === 0) ready.push(link.target.id);
		}
	}

	if (orderedGroupIds.length === emptyGroups.length) return { orderedGroupIds };

	const orderedGroupIdSet = new Set(orderedGroupIds);
	const residualGroupIds = new Set(
		emptyGroups.map((group) => group.id).filter((groupId) => !orderedGroupIdSet.has(groupId)),
	);
	return {
		cycleGroupId:
			findEmptyGroupCycleMember(residualGroupIds, graph.outgoingByGroup) ??
			(residualGroupIds.values().next().value as string),
	};
}

function projectOrderedGroups(
	orderedGroupIds: string[],
	graph: Pick<ProjectionGraph, 'outgoingByGroup' | 'routesByGroup'>,
	nodesById: Map<string, INode>,
) {
	const projectionByKey = new Map<
		string,
		{ connection: EmptyGroupCanonicalConnection; pathCount: number; ownerGroupId: string }
	>();
	for (const groupId of orderedGroupIds) {
		const routes = graph.routesByGroup.get(groupId);
		for (const link of graph.outgoingByGroup.get(groupId) ?? []) {
			if (link.target.kind === 'group') {
				for (const route of routes?.values() ?? []) {
					addSourceRoute(graph.routesByGroup, link.target.id, route.endpoint, route.pathCount);
				}
				continue;
			}

			const targetNode = nodesById.get(link.target.id);
			if (!targetNode) continue;
			for (const route of routes?.values() ?? []) {
				const sourceNode = nodesById.get(route.endpoint.id);
				if (!sourceNode) continue;
				const connection: EmptyGroupCanonicalConnection = {
					sourceNode: sourceNode.name,
					sourceType: route.endpoint.port.type,
					sourceIndex: route.endpoint.port.index,
					targetNode: targetNode.name,
					targetType: link.target.port.type,
					targetIndex: link.target.port.index,
				};
				const key = canonicalConnectionKey(connection);
				const current = projectionByKey.get(key);
				projectionByKey.set(key, {
					connection,
					pathCount: Math.min(2, (current?.pathCount ?? 0) + route.pathCount),
					ownerGroupId: current?.ownerGroupId ?? groupId,
				});
			}
		}
	}
	return projectionByKey;
}

/**
 * Derives node-only executable connections from all complete visual paths.
 * One-sided paths deliberately produce no executable connection.
 */
function deriveEmptyGroupProjectionWithOwners({
	nodes,
	nodeGroups,
}: {
	nodes: INode[];
	nodeGroups: IWorkflowGroup[];
}): DerivedEmptyGroupProjection {
	const context = prepareProjectionContext(nodes, nodeGroups);
	if ('issues' in context) return { success: false, issues: context.issues };

	const { emptyGroups, links, nodesById } = context;
	const graph = buildProjectionGraph(emptyGroups, links);
	const orderResult = orderEmptyGroups(emptyGroups, graph);
	if ('cycleGroupId' in orderResult) {
		return failure(
			issue(
				'empty-group-cycle',
				'Visual links contain a directed cycle between empty groups.',
				orderResult.cycleGroupId,
			),
		);
	}

	const projectionByKey = projectOrderedGroups(orderResult.orderedGroupIds, graph, nodesById);

	const duplicate = [...projectionByKey.values()].find(({ pathCount }) => pathCount > 1);
	if (duplicate) {
		return failure(
			issue(
				'duplicate-projected-connection',
				`More than one visual path projects to ${canonicalConnectionKey(duplicate.connection)}.`,
				duplicate.ownerGroupId,
			),
		);
	}

	return {
		success: true,
		projection: [...projectionByKey.values()].map(({ connection }) => connection),
		ownerGroupIdByConnectionKey: new Map(
			[...projectionByKey.entries()].map(([key, { ownerGroupId }]) => [key, ownerGroupId]),
		),
	};
}

/**
 * Derives node-only executable connections from all complete visual paths.
 * One-sided paths deliberately produce no executable connection.
 */
export function deriveEmptyGroupProjection(input: {
	nodes: INode[];
	nodeGroups: IWorkflowGroup[];
}): EmptyGroupProjectionResult {
	const result = deriveEmptyGroupProjectionWithOwners(input);
	return result.success
		? { success: true, projection: result.projection }
		: { success: false, issues: result.issues };
}

function matchingConnectionCount(
	connections: IConnections,
	connection: EmptyGroupCanonicalConnection,
): number {
	const sourceConnections = Object.prototype.hasOwnProperty.call(connections, connection.sourceNode)
		? connections[connection.sourceNode]
		: undefined;
	const sourceTypeConnections = sourceConnections?.[connection.sourceType];
	const bucket = sourceTypeConnections?.[connection.sourceIndex];
	if (!bucket) return 0;
	return bucket.filter(
		(candidate) =>
			candidate.node === connection.targetNode &&
			candidate.type === connection.targetType &&
			candidate.index === connection.targetIndex,
	).length;
}

function removeCanonicalConnection(
	connections: IConnections,
	connection: EmptyGroupCanonicalConnection,
) {
	const sourceConnections = Object.prototype.hasOwnProperty.call(connections, connection.sourceNode)
		? connections[connection.sourceNode]
		: undefined;
	const bucket = sourceConnections?.[connection.sourceType]?.[connection.sourceIndex];
	if (!bucket) return;
	const index = bucket.findIndex(
		(candidate) =>
			candidate.node === connection.targetNode &&
			candidate.type === connection.targetType &&
			candidate.index === connection.targetIndex,
	);
	if (index >= 0) bucket.splice(index, 1);
}

function setOwnProperty<T>(target: Record<string, T>, key: string, value: T) {
	Object.defineProperty(target, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true,
	});
}

/**
 * Clones the constrained `IConnections` shape while preserving every own node
 * name. The generic `deepCopy` helper intentionally filters prototype-related
 * keys, but those strings can still arrive as source-node names in imported
 * workflow JSON and reconciliation must not erase unrelated data.
 */
function cloneConnections(connections: IConnections): IConnections {
	const clone: IConnections = {};
	for (const sourceNode of Object.keys(connections)) {
		const sourceClone = {};
		setOwnProperty(clone, sourceNode, sourceClone);
		for (const connectionType of Object.keys(connections[sourceNode])) {
			const buckets = connections[sourceNode][connectionType];
			setOwnProperty(
				sourceClone,
				connectionType,
				buckets.map(
					(bucket) =>
						bucket?.map((target) => ({
							node: target.node,
							type: target.type,
							index: target.index,
						})) ?? null,
				),
			);
		}
	}
	return clone;
}

function addCanonicalConnection(
	connections: IConnections,
	connection: EmptyGroupCanonicalConnection,
) {
	let sourceConnections = Object.prototype.hasOwnProperty.call(connections, connection.sourceNode)
		? connections[connection.sourceNode]
		: undefined;
	if (!sourceConnections) {
		sourceConnections = {};
		setOwnProperty(connections, connection.sourceNode, sourceConnections);
	}

	let sourceTypeConnections = sourceConnections[connection.sourceType];
	if (!sourceTypeConnections) {
		sourceTypeConnections = [];
		setOwnProperty(sourceConnections, connection.sourceType, sourceTypeConnections);
	}
	while (sourceTypeConnections.length <= connection.sourceIndex) sourceTypeConnections.push(null);

	let bucket = sourceTypeConnections[connection.sourceIndex];
	if (!bucket) {
		bucket = [];
		sourceTypeConnections[connection.sourceIndex] = bucket;
	}
	bucket.push({
		node: connection.targetNode,
		type: connection.targetType,
		index: connection.targetIndex,
	});
}

function graphNodeKey(nodeId: string): string {
	return `node:${nodeId}`;
}

function graphGroupKey(groupId: string): string {
	return `group:${groupId}`;
}

function addGraphEdge(adjacency: Map<string, Set<string>>, source: string, target: string) {
	const outgoing = adjacency.get(source);
	if (outgoing) outgoing.add(target);
	else adjacency.set(source, new Set([target]));
}

function findGroupInCycle(
	nodes: INode[],
	connections: IConnections,
	previousProjectionKeys: Set<string>,
	nextNodeGroups: IWorkflowGroup[],
): string | undefined {
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const adjacency = new Map<string, Set<string>>();

	for (const [sourceName, sourceConnections] of Object.entries(connections)) {
		const sourceNode = nodesByName.get(sourceName);
		if (!sourceNode) continue;
		const buckets = sourceConnections[NodeConnectionTypes.Main] ?? [];
		for (let sourceIndex = 0; sourceIndex < buckets.length; sourceIndex++) {
			for (const target of buckets[sourceIndex] ?? []) {
				if (target.type !== NodeConnectionTypes.Main) continue;
				const targetNode = nodesByName.get(target.node);
				if (!targetNode) continue;
				const key = canonicalConnectionKey({
					sourceNode: sourceName,
					sourceType: NodeConnectionTypes.Main,
					sourceIndex,
					targetNode: target.node,
					targetType: target.type,
					targetIndex: target.index,
				});
				if (previousProjectionKeys.has(key)) continue;
				addGraphEdge(adjacency, graphNodeKey(sourceNode.id), graphNodeKey(targetNode.id));
			}
		}
	}

	for (const group of nextNodeGroups) {
		for (const link of group.visualLinks ?? []) {
			const source =
				link.source.kind === 'node' ? graphNodeKey(link.source.id) : graphGroupKey(link.source.id);
			const target =
				link.target.kind === 'node' ? graphNodeKey(link.target.id) : graphGroupKey(link.target.id);
			addGraphEdge(adjacency, source, target);
		}
	}

	const groupKey = findVertexInCycle(adjacency, (vertex) => vertex.startsWith('group:'));
	return groupKey?.slice('group:'.length);
}

/**
 * Validates a saved group/connection pair without allocating a replacement
 * connection graph. A matching canonical occurrence is owned by its visual
 * path; a second matching occurrence is ambiguous and therefore invalid.
 */
export function validateEmptyGroupConnectionState({
	nodes,
	connections,
	nodeGroups,
}: ValidateEmptyGroupConnectionStateInput): EmptyGroupProjectionResult {
	const result = deriveEmptyGroupProjectionWithOwners({ nodes, nodeGroups });
	if (!result.success) return result;

	const projectionKeys = new Set<string>();
	for (const projectedConnection of result.projection) {
		const key = canonicalConnectionKey(projectedConnection);
		projectionKeys.add(key);
		const count = matchingConnectionCount(connections, projectedConnection);
		if (count === 0) {
			return failure(
				issue(
					'missing-projected-connection',
					`The visual projection owns ${key}, but that connection is missing.`,
					result.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
		if (count > 1) {
			return failure(
				issue(
					'projected-connection-multiplicity',
					`The visual projection owns ${key}, but ${count} matching occurrences exist.`,
					result.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
	}

	const cycleGroupId = findGroupInCycle(nodes, connections, projectionKeys, nodeGroups);
	if (cycleGroupId) {
		return failure(
			issue(
				'empty-group-cycle',
				'The saved topology contains a directed cycle that passes through an empty group.',
				cycleGroupId,
			),
		);
	}

	return result;
}

/**
 * Produces one complete candidate document state without mutating its input.
 * It preserves ordinary connection occurrences and changes only the set
 * difference between the previous and next visual projections.
 */
export function reconcileEmptyGroupConnections({
	nodes,
	connections,
	previousNodeGroups,
	nextNodeGroups,
}: ReconcileEmptyGroupConnectionsInput): ReconcileEmptyGroupConnectionsResult {
	const previousResult = deriveEmptyGroupProjectionWithOwners({
		nodes,
		nodeGroups: previousNodeGroups,
	});
	if (!previousResult.success) return previousResult;
	const nextResult = deriveEmptyGroupProjectionWithOwners({ nodes, nodeGroups: nextNodeGroups });
	if (!nextResult.success) return nextResult;

	const previousByKey = new Map(
		previousResult.projection.map((connection) => [canonicalConnectionKey(connection), connection]),
	);
	const nextByKey = new Map(
		nextResult.projection.map((connection) => [canonicalConnectionKey(connection), connection]),
	);

	for (const [key, projectedConnection] of previousByKey) {
		const count = matchingConnectionCount(connections, projectedConnection);
		if (count === 0) {
			return failure(
				issue(
					'missing-projected-connection',
					`The previous visual projection owns ${key}, but that connection is missing.`,
					previousResult.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
		if (count > 1) {
			return failure(
				issue(
					'projected-connection-multiplicity',
					`The previous visual projection owns ${key}, but ${count} matching occurrences exist.`,
					previousResult.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
	}

	for (const [key, projectedConnection] of nextByKey) {
		if (previousByKey.has(key)) continue;
		if (matchingConnectionCount(connections, projectedConnection) > 0) {
			return failure(
				issue(
					'canonical-connection-collision',
					`The new visual projection collides with ordinary connection ${key}.`,
					nextResult.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
	}

	const cycleGroupId = findGroupInCycle(
		nodes,
		connections,
		new Set(previousByKey.keys()),
		nextNodeGroups,
	);
	if (cycleGroupId) {
		return failure(
			issue(
				'empty-group-cycle',
				'The candidate topology contains a directed cycle that passes through an empty group.',
				cycleGroupId,
			),
		);
	}

	const removed = previousResult.projection.filter(
		(connection) => !nextByKey.has(canonicalConnectionKey(connection)),
	);
	const added = nextResult.projection.filter(
		(connection) => !previousByKey.has(canonicalConnectionKey(connection)),
	);
	const nextConnections = cloneConnections(connections);
	for (const connection of removed) removeCanonicalConnection(nextConnections, connection);
	for (const connection of added) addCanonicalConnection(nextConnections, connection);

	return {
		success: true,
		value: {
			nodeGroups: deepCopy(nextNodeGroups),
			connections: nextConnections,
		},
		projection: {
			previous: previousResult.projection,
			next: nextResult.projection,
			added,
			removed,
		},
	};
}
