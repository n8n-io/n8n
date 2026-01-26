/**
 * Sync Workflow with CRDT Document
 *
 * Shared function that can be used by both:
 * - Server (packages/cli/src/crdt/crdt-websocket.service.ts)
 * - Worker Mode (packages/frontend/editor-ui/src/app/workers/coordinator)
 */

import type {
	IConnections,
	INode,
	INodeExecutionData,
	IPinData,
	NodeConnectionType,
} from './interfaces';
import type { Workflow } from './workflow';
import type { CRDTEdge } from './crdt-workflow-helpers';

// =============================================================================
// Minimal CRDT Interfaces (no @n8n/crdt dependency)
// =============================================================================

/**
 * Minimal interface for CRDT Map operations.
 * Compatible with @n8n/crdt CRDTMap but doesn't require the dependency.
 */
interface CRDTMapLike<T = unknown> {
	get(key: string): T | undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	entries(): IterableIterator<[string, any]>;
	onDeepChange(handler: () => void): () => void;
	toJSON?(): Record<string, unknown>;
}

/**
 * Minimal interface for CRDT Document operations.
 * Compatible with @n8n/crdt CRDTDoc but doesn't require the dependency.
 */
interface CRDTDocLike {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getMap<T = unknown>(name: string): any;
}

/** Unsubscribe function type */
type Unsubscribe = () => void;

// =============================================================================
// Main Function
// =============================================================================

/**
 * Synchronizes a Workflow instance with a CRDT document.
 *
 * This function subscribes to changes in the CRDT document and updates
 * the Workflow instance accordingly. The Workflow's nodes and connections
 * are updated via its setNodes and setConnections methods.
 *
 * Edges are stored flat in CRDT (Vue Flow format) and converted to
 * IConnections format for the Workflow class.
 *
 * @param doc - The CRDT document to sync from
 * @param workflow - The Workflow instance to keep in sync
 * @returns An unsubscribe function to stop syncing
 */
export function syncWorkflowWithDoc(doc: CRDTDocLike, workflow: Workflow): Unsubscribe {
	const meta = doc.getMap<unknown>('meta');
	const nodesMap = doc.getMap<unknown>('nodes');
	const edgesMap = doc.getMap<unknown>('edges');
	const pinnedDataMap = doc.getMap<unknown>('pinnedData');

	/**
	 * Build a lookup map from node ID to node name.
	 * Used for converting edges (use node IDs) to IConnections (use node names).
	 * Also used for converting pinned data from ID-keyed to name-keyed.
	 */
	function getNodeNameById(): Map<string, string> {
		const map = new Map<string, string>();
		for (const [id, nodeValue] of nodesMap.entries()) {
			if (nodeValue && typeof nodeValue === 'object') {
				const node =
					'toJSON' in nodeValue
						? (nodeValue as { toJSON(): INode }).toJSON()
						: (nodeValue as INode);
				if (node?.name) {
					map.set(id, node.name);
				}
			}
		}
		return map;
	}

	/**
	 * Sync edges from CRDT to Workflow.setConnections().
	 * Converts flat edge format to nested IConnections format.
	 */
	function syncEdges(): void {
		const edges = extractEdges(edgesMap);
		const nodeNameById = getNodeNameById();
		const connections = edgesToIConnections(edges, nodeNameById);
		workflow.setConnections(connections);
	}

	/**
	 * Sync pinned data from CRDT to Workflow.setPinData().
	 * Converts from ID-keyed (CRDT) to name-keyed (Workflow) format.
	 */
	function syncPinData(): void {
		const nodeNameById = getNodeNameById();
		const pinData: IPinData = {};

		for (const [nodeId, value] of pinnedDataMap.entries()) {
			const nodeName = nodeNameById.get(nodeId);
			if (!nodeName) continue;

			// Handle both plain array and CRDT array (with toJSON)
			const data: INodeExecutionData[] =
				value && typeof value === 'object' && 'toJSON' in value
					? (value as { toJSON(): INodeExecutionData[] }).toJSON()
					: (value as INodeExecutionData[]);

			if (data && data.length > 0) {
				pinData[nodeName] = data;
			}
		}

		workflow.setPinData(Object.keys(pinData).length > 0 ? pinData : undefined);
	}

	// Sync meta changes (name, settings)
	const metaUnsub = meta.onDeepChange(() => {
		const name = meta.get('name') as string | undefined;
		if (name !== undefined) {
			workflow.name = name;
		}
		const settings = meta.get('settings');
		if (settings !== undefined) {
			workflow.setSettings(settings as typeof workflow.settings);
		}
	});

	// Sync nodes changes
	const nodesUnsub = nodesMap.onDeepChange(() => {
		const nodes = extractNodes(nodesMap);
		workflow.setNodes(nodes);
		// Also resync edges since node names might have changed
		syncEdges();
		// Also resync pinned data since node names might have changed
		syncPinData();
	});

	// Sync edge changes
	const edgesUnsub = edgesMap.onDeepChange(() => {
		syncEdges();
	});

	// Sync pinned data changes
	const pinnedDataUnsub = pinnedDataMap.onDeepChange(() => {
		syncPinData();
	});

	// Return combined unsubscribe function
	return () => {
		metaUnsub();
		nodesUnsub();
		edgesUnsub();
		pinnedDataUnsub();
	};
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract nodes from a CRDT nodes map as an array.
 */
function extractNodes(nodesMap: CRDTMapLike<unknown>): INode[] {
	const nodes: INode[] = [];

	for (const [, nodeValue] of nodesMap.entries()) {
		let node: INode;
		// Handle CRDTMap (nested structure) or plain object
		if (nodeValue && typeof nodeValue === 'object' && 'toJSON' in nodeValue) {
			node = (nodeValue as { toJSON(): INode }).toJSON();
		} else {
			node = nodeValue as INode;
		}

		if (node && node.id) {
			nodes.push(node);
		}
	}

	return nodes;
}

/**
 * Extract edges from a CRDT edges map as an array.
 */
function extractEdges(edgesMap: CRDTMapLike<unknown>): CRDTEdge[] {
	const edges: CRDTEdge[] = [];

	for (const [id, edgeValue] of edgesMap.entries()) {
		let edge: CRDTEdge;
		// Handle CRDTMap (nested structure) or plain object
		if (edgeValue && typeof edgeValue === 'object' && 'toJSON' in edgeValue) {
			edge = (edgeValue as { toJSON(): CRDTEdge }).toJSON();
		} else {
			edge = edgeValue as CRDTEdge;
		}

		if (edge) {
			edges.push({ ...edge, id });
		}
	}

	return edges;
}

/**
 * Parse a handle string into type and index.
 * Handle format: "{mode}/{type}/{index}" e.g., "outputs/main/0"
 */
function parseHandle(handle: string): { type: NodeConnectionType; index: number } {
	const parts = handle.split('/');
	// Format: mode/type/index (e.g., "outputs/main/0")
	const type = (parts[1] ?? 'main') as NodeConnectionType;
	const index = parseInt(parts[2] ?? '0', 10);
	return { type, index };
}

/**
 * Convert flat edges array to nested IConnections format.
 *
 * @param edges - Flat edges array (Vue Flow format)
 * @param nodeNameById - Map from node ID to node name
 * @returns IConnections format expected by Workflow class
 */
function edgesToIConnections(edges: CRDTEdge[], nodeNameById: Map<string, string>): IConnections {
	const connections: IConnections = {};

	for (const edge of edges) {
		const sourceName = nodeNameById.get(edge.source);
		const targetName = nodeNameById.get(edge.target);

		// Skip edges where we can't resolve node names
		if (!sourceName || !targetName) continue;

		const { type: sourceType, index: sourceIndex } = parseHandle(edge.sourceHandle);
		const { type: targetType, index: targetIndex } = parseHandle(edge.targetHandle);

		// Initialize nested structure
		connections[sourceName] ??= {};
		connections[sourceName][sourceType] ??= [];

		// Ensure array has enough slots (sparse array handling)
		while (connections[sourceName][sourceType].length <= sourceIndex) {
			connections[sourceName][sourceType].push(null);
		}

		// Initialize the connections array for this output index
		connections[sourceName][sourceType][sourceIndex] ??= [];

		// Add the connection
		connections[sourceName][sourceType][sourceIndex].push({
			node: targetName,
			type: targetType,
			index: targetIndex,
		});
	}

	return connections;
}
