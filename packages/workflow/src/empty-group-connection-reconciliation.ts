import { buildAdjacencyList, hasPath } from './graph/graph-utils';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type IWorkflowGroup,
	type IWorkflowGroupVisualLink,
	type IWorkflowGroupVisualLinkEndpoint,
	type IWorkflowGroupVisualLinkGroupEndpoint,
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
	| 'unsupported-group-to-group-link'
	| 'unsupported-node-name'
	| 'unsupported-visual-link'
	| 'visual-link-to-non-empty-group';

export interface EmptyGroupConnectionIssue {
	code: EmptyGroupConnectionIssueCode;
	message: string;
	groupId?: string;
}

/** The six fields form the identity of one executable connection. */
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

type EmptyGroupRoutes = {
	group: IWorkflowGroup;
	incoming: IWorkflowGroupVisualLinkNodeEndpoint[];
	outgoing: IWorkflowGroupVisualLinkNodeEndpoint[];
};

type DerivedProjection =
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

function failWithIssues(issues: EmptyGroupConnectionIssue[]) {
	const [first, ...rest] = issues;
	return first ? failure(first, ...rest) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFinitePair(value: unknown): value is [number, number] {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		value.every((part) => typeof part === 'number' && Number.isFinite(part))
	);
}

function hasValidFrame(group: IWorkflowGroup) {
	const frame: unknown = group.frame;
	return (
		isRecord(frame) &&
		isFinitePair(frame.position) &&
		isFinitePair(frame.size) &&
		frame.size.every((part) => part > 0)
	);
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

function endpointKey(endpoint: IWorkflowGroupVisualLinkEndpoint) {
	return JSON.stringify([endpoint.kind, endpoint.id, endpoint.port.type, endpoint.port.index]);
}

function visualLinkKey(link: IWorkflowGroupVisualLink) {
	return JSON.stringify([endpointKey(link.source), endpointKey(link.target)]);
}

function canonicalConnectionKey(connection: EmptyGroupCanonicalConnection) {
	return JSON.stringify([
		connection.sourceNode,
		connection.sourceType,
		connection.sourceIndex,
		connection.targetNode,
		connection.targetType,
		connection.targetIndex,
	]);
}

function prepareProjectionContext({
	nodes,
	nodeGroups,
	validateGroupShape,
}: {
	nodes: INode[];
	nodeGroups: IWorkflowGroup[];
	validateGroupShape: boolean;
}) {
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
	const routesByGroupId = new Map<string, EmptyGroupRoutes>();
	for (const group of nodeGroups) {
		if (groupsById.has(group.id)) {
			issues.push(issue('duplicate-group-id', `Group ID "${group.id}" is not unique.`, group.id));
		} else {
			groupsById.set(group.id, group);
		}
		if (group.nodeIds.length === 0) {
			routesByGroupId.set(group.id, { group, incoming: [], outgoing: [] });
			if (validateGroupShape && !hasValidFrame(group)) {
				issues.push(
					issue(
						'invalid-empty-group-frame',
						`Empty group "${group.name}" must have a finite position and positive finite size.`,
						group.id,
					),
				);
			}
		} else if (
			validateGroupShape &&
			(group.frame !== undefined || group.visualLinks !== undefined)
		) {
			issues.push(
				issue(
					'non-empty-group-data',
					`Non-empty group "${group.name}" must not retain empty-group frame or visual-link data.`,
					group.id,
				),
			);
		}
	}

	return { issues, nodesById, groupsById, routesByGroupId };
}

function validateAndAddVisualLink({
	candidate,
	routes,
	seenLinks,
	nodesById,
	groupsById,
}: {
	candidate: unknown;
	routes: EmptyGroupRoutes;
	seenLinks: Set<string>;
	nodesById: Map<string, INode>;
	groupsById: Map<string, IWorkflowGroup>;
}): EmptyGroupConnectionIssue | undefined {
	const link = parseVisualLink(candidate);
	if (!link) {
		return issue(
			'unsupported-visual-link',
			`Group "${routes.group.name}" contains a malformed visual link.`,
			routes.group.id,
		);
	}

	const linkKey = visualLinkKey(link);
	if (seenLinks.has(linkKey)) {
		return issue(
			'duplicate-visual-link',
			`Visual link ${linkKey} is stored more than once.`,
			routes.group.id,
		);
	}
	seenLinks.add(linkKey);

	let groupEndpoint: IWorkflowGroupVisualLinkGroupEndpoint;
	let nodeEndpoint: IWorkflowGroupVisualLinkNodeEndpoint;
	let isIncoming: boolean;
	if (link.source.kind === 'group') {
		if (link.target.kind === 'group') {
			return issue(
				'unsupported-group-to-group-link',
				'This proof does not support a visual link between two groups.',
				routes.group.id,
			);
		}
		groupEndpoint = link.source;
		nodeEndpoint = link.target;
		isIncoming = false;
	} else {
		if (link.target.kind === 'node') {
			return issue(
				'unsupported-visual-link',
				'An empty-group visual link must connect one node and its owning group.',
				routes.group.id,
			);
		}
		groupEndpoint = link.target;
		nodeEndpoint = link.source;
		isIncoming = true;
	}
	const endpointGroup = groupsById.get(groupEndpoint.id);
	if (!endpointGroup) {
		return issue(
			'unknown-group-endpoint',
			`Visual link references unknown group "${groupEndpoint.id}".`,
			routes.group.id,
		);
	}
	if (endpointGroup.nodeIds.length > 0) {
		return issue(
			'visual-link-to-non-empty-group',
			`Visual link references non-empty group "${groupEndpoint.id}".`,
			routes.group.id,
		);
	}
	if (groupEndpoint.id !== routes.group.id) {
		return issue(
			'invalid-visual-link-owner',
			`Visual link ${linkKey} must be stored by group "${groupEndpoint.id}".`,
			routes.group.id,
		);
	}
	if (!nodesById.has(nodeEndpoint.id)) {
		return issue(
			'unknown-node-endpoint',
			`Visual link references unknown node "${nodeEndpoint.id}".`,
			routes.group.id,
		);
	}

	if (isIncoming) routes.incoming.push(nodeEndpoint);
	else routes.outgoing.push(nodeEndpoint);
	return undefined;
}

function prepareVisualLinks({
	routesByGroupId,
	nodesById,
	groupsById,
}: {
	routesByGroupId: Map<string, EmptyGroupRoutes>;
	nodesById: Map<string, INode>;
	groupsById: Map<string, IWorkflowGroup>;
}) {
	const issues: EmptyGroupConnectionIssue[] = [];
	const seenLinks = new Set<string>();
	for (const routes of routesByGroupId.values()) {
		const rawLinks: unknown = routes.group.visualLinks;
		if (rawLinks === undefined) continue;
		if (!Array.isArray(rawLinks)) {
			issues.push(
				issue(
					'unsupported-visual-link',
					`Group "${routes.group.name}" has malformed visual-link data.`,
					routes.group.id,
				),
			);
			continue;
		}
		for (const candidate of rawLinks) {
			const linkIssue = validateAndAddVisualLink({
				candidate,
				routes,
				seenLinks,
				nodesById,
				groupsById,
			});
			if (linkIssue) issues.push(linkIssue);
		}
	}
	return issues;
}

function projectRoutes(
	routesByGroupId: Map<string, EmptyGroupRoutes>,
	nodesById: Map<string, INode>,
): DerivedProjection {
	const issues: EmptyGroupConnectionIssue[] = [];
	const projectionByKey = new Map<
		string,
		{ connection: EmptyGroupCanonicalConnection; ownerGroupId: string }
	>();
	for (const routes of routesByGroupId.values()) {
		for (const target of routes.outgoing) {
			for (const source of routes.incoming) {
				const sourceNode = nodesById.get(source.id);
				const targetNode = nodesById.get(target.id);
				if (!sourceNode || !targetNode) continue;
				const connection: EmptyGroupCanonicalConnection = {
					sourceNode: sourceNode.name,
					sourceType: NodeConnectionTypes.Main,
					sourceIndex: source.port.index,
					targetNode: targetNode.name,
					targetType: NodeConnectionTypes.Main,
					targetIndex: target.port.index,
				};
				const key = canonicalConnectionKey(connection);
				if (projectionByKey.has(key)) {
					issues.push(
						issue(
							'duplicate-projected-connection',
							`More than one visual path projects connection ${key}.`,
							routes.group.id,
						),
					);
				} else {
					projectionByKey.set(key, { connection, ownerGroupId: routes.group.id });
				}
			}
		}
	}

	const projectionFailure = failWithIssues(issues);
	if (projectionFailure) return projectionFailure;
	return {
		success: true,
		projection: [...projectionByKey.values()].map(({ connection }) => connection),
		ownerGroupIdByConnectionKey: new Map(
			[...projectionByKey].map(([key, value]) => [key, value.ownerGroupId]),
		),
	};
}

function deriveEmptyGroupProjectionWithOwners({
	nodes,
	nodeGroups,
	validateGroupShape,
}: {
	nodes: INode[];
	nodeGroups: IWorkflowGroup[];
	validateGroupShape: boolean;
}): DerivedProjection {
	const context = prepareProjectionContext({ nodes, nodeGroups, validateGroupShape });
	const contextFailure = failWithIssues(context.issues);
	if (contextFailure) return contextFailure;

	const linkFailure = failWithIssues(prepareVisualLinks(context));
	if (linkFailure) return linkFailure;
	return projectRoutes(context.routesByGroupId, context.nodesById);
}

/** Derives node-only connections for standalone empty groups. */
export function deriveEmptyGroupProjection(input: {
	nodes: INode[];
	nodeGroups: IWorkflowGroup[];
}): EmptyGroupProjectionResult {
	const result = deriveEmptyGroupProjectionWithOwners({ ...input, validateGroupShape: true });
	return result.success
		? { success: true, projection: result.projection }
		: { success: false, issues: result.issues };
}

function matchingConnectionCount(
	connections: IConnections,
	connection: EmptyGroupCanonicalConnection,
) {
	const sourceConnections = Object.prototype.hasOwnProperty.call(connections, connection.sourceNode)
		? connections[connection.sourceNode]
		: undefined;
	const bucket = sourceConnections?.[connection.sourceType]?.[connection.sourceIndex];
	if (!bucket) return 0;
	return bucket.filter(
		(candidate) =>
			candidate.node === connection.targetNode &&
			candidate.type === connection.targetType &&
			candidate.index === connection.targetIndex,
	).length;
}

function setOwnProperty<T>(target: Record<string, T>, key: string, value: T) {
	Object.defineProperty(target, key, {
		value,
		writable: true,
		enumerable: true,
		configurable: true,
	});
}

function cloneConnections(connections: IConnections): IConnections {
	const clone: IConnections = {};
	for (const sourceNode of Object.keys(connections)) {
		const sourceClone: IConnections[string] = {};
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

	let buckets = sourceConnections[connection.sourceType];
	if (!buckets) {
		buckets = [];
		setOwnProperty(sourceConnections, connection.sourceType, buckets);
	}
	while (buckets.length <= connection.sourceIndex) buckets.push(null);
	let bucket = buckets[connection.sourceIndex];
	if (!bucket) {
		bucket = [];
		buckets[connection.sourceIndex] = bucket;
	}
	bucket.push({
		node: connection.targetNode,
		type: connection.targetType,
		index: connection.targetIndex,
	});
}

function findProjectionCycle(
	connections: IConnections,
	projection: EmptyGroupCanonicalConnection[],
	ownerGroupIdByConnectionKey: Map<string, string>,
) {
	const adjacencyList = buildAdjacencyList(connections);
	for (const connection of projection) {
		if (hasPath(connection.targetNode, connection.sourceNode, adjacencyList)) {
			return ownerGroupIdByConnectionKey.get(canonicalConnectionKey(connection));
		}
	}
	return undefined;
}

/**
 * Validates the persisted visual-link and canonical-connection pair.
 * The caller validates frame and non-empty-group data before it calls this function.
 */
export function validateEmptyGroupConnectionState({
	nodes,
	connections,
	nodeGroups,
}: ValidateEmptyGroupConnectionStateInput): EmptyGroupProjectionResult {
	const result = deriveEmptyGroupProjectionWithOwners({
		nodes,
		nodeGroups,
		validateGroupShape: false,
	});
	if (!result.success) return result;

	for (const projectedConnection of result.projection) {
		const key = canonicalConnectionKey(projectedConnection);
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
					`The visual projection owns ${key}, but ${count} matching connections exist.`,
					result.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
	}

	const cycleGroupId = findProjectionCycle(
		connections,
		result.projection,
		result.ownerGroupIdByConnectionKey,
	);
	return cycleGroupId
		? failure(
				issue(
					'empty-group-cycle',
					'The saved topology has a directed cycle through an empty group.',
					cycleGroupId,
				),
			)
		: { success: true, projection: result.projection };
}

/** Produces one complete candidate state without mutating its input. */
export function reconcileEmptyGroupConnections({
	nodes,
	connections,
	previousNodeGroups,
	nextNodeGroups,
}: ReconcileEmptyGroupConnectionsInput): ReconcileEmptyGroupConnectionsResult {
	const previousResult = deriveEmptyGroupProjectionWithOwners({
		nodes,
		nodeGroups: previousNodeGroups,
		validateGroupShape: true,
	});
	if (!previousResult.success) return previousResult;
	const nextResult = deriveEmptyGroupProjectionWithOwners({
		nodes,
		nodeGroups: nextNodeGroups,
		validateGroupShape: true,
	});
	if (!nextResult.success) return nextResult;

	const previousByKey = new Map(
		previousResult.projection.map((connection) => [canonicalConnectionKey(connection), connection]),
	);
	const nextByKey = new Map(
		nextResult.projection.map((connection) => [canonicalConnectionKey(connection), connection]),
	);

	for (const [key, connection] of previousByKey) {
		const count = matchingConnectionCount(connections, connection);
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
					`The previous visual projection owns ${key}, but ${count} matching connections exist.`,
					previousResult.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
	}

	for (const [key, connection] of nextByKey) {
		if (!previousByKey.has(key) && matchingConnectionCount(connections, connection) > 0) {
			return failure(
				issue(
					'canonical-connection-collision',
					`The new visual projection collides with connection ${key}.`,
					nextResult.ownerGroupIdByConnectionKey.get(key),
				),
			);
		}
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

	const cycleGroupId = findProjectionCycle(
		nextConnections,
		nextResult.projection,
		nextResult.ownerGroupIdByConnectionKey,
	);
	if (cycleGroupId) {
		return failure(
			issue(
				'empty-group-cycle',
				'The candidate topology has a directed cycle through an empty group.',
				cycleGroupId,
			),
		);
	}

	return {
		success: true,
		value: { nodeGroups: deepCopy(nextNodeGroups), connections: nextConnections },
		projection: {
			previous: previousResult.projection,
			next: nextResult.projection,
			added,
			removed,
		},
	};
}
