/**
 * CRDT Workflow Helpers
 *
 * Shared functions for CRDT workflow operations that can be used by both:
 * - Server (packages/cli/src/crdt/crdt-websocket.service.ts)
 * - Worker Mode (packages/frontend/editor-ui/src/app/workers/coordinator)
 *
 * These functions handle:
 * - Handle computation and normalization
 * - Node subtitle computation
 * - CRDT node map conversion
 * - Connection format conversion
 */

import type {
	IConnections,
	INode,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypes,
	IPinData,
	NodeConnectionType,
} from './interfaces';
import * as NodeHelpers from './node-helpers';
import type { Workflow } from './workflow';
import { calculateNodeSize } from './node-size-calculator';
import { applyAccessPatterns } from './node-reference-parser-utils';

// =============================================================================
// Minimal CRDT Interfaces (no @n8n/crdt dependency)
// =============================================================================

/**
 * Minimal interface for CRDT Map operations.
 * Compatible with @n8n/crdt CRDTMap but doesn't require the dependency.
 */
export interface CRDTMapLike<T = unknown> {
	get(key: string): T | CRDTMapLike<unknown> | CRDTArrayLike<unknown> | undefined;
	set(key: string, value: T | CRDTMapLike<unknown> | CRDTArrayLike<unknown>): void;
	delete(key: string): void;
	keys(): IterableIterator<string>;
	toJSON?(): Record<string, unknown>;
	/** Subscribe to deep changes in this map */
	onDeepChange?(handler: (changes: DeepChangeLike[]) => void): () => void;
}

/**
 * Minimal interface for CRDT Array operations.
 * Compatible with @n8n/crdt CRDTArray but doesn't require the dependency.
 */
export interface CRDTArrayLike<T = unknown> {
	readonly length: number;
	get(index: number): T | undefined;
	push(...items: T[]): void;
	toArray(): T[];
	toJSON(): unknown[];
}

/**
 * Minimal interface for CRDT Document operations.
 * Compatible with @n8n/crdt CRDTDoc but doesn't require the dependency.
 */
export interface CRDTDocLike {
	/** Document identifier */
	id: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	createMap<T = unknown>(): any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	createArray<T = unknown>(): any;
	transact(fn: () => void): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getMap<T = unknown>(name: string): any;
}

/**
 * Minimal interface for deep change events.
 * Compatible with @n8n/crdt DeepChangeEvent.
 */
export interface DeepChangeLike {
	path: Array<string | number>;
	action?: 'add' | 'update' | 'delete';
}

// =============================================================================
// Types
// =============================================================================

/**
 * Computed handle for a node (Vue Flow compatible).
 * Pre-computed on the server/worker to avoid expression evaluation on the main thread.
 */
export interface ComputedHandle {
	/** Handle ID, e.g., "inputs/main/0" or "outputs/ai_tool/1" */
	handleId: string;
	/** NodeConnectionType (e.g., "main", "ai_tool") */
	type: string;
	/** Whether this is an input or output handle */
	mode: 'inputs' | 'outputs';
	/** Index within handles of the same type */
	index: number;
	/** Display name for the handle */
	displayName?: string;
	/** Whether the handle is required */
	required?: boolean;
	/** Maximum number of connections allowed */
	maxConnections?: number;
}

/**
 * Flat edge format stored in CRDT (Vue Flow native).
 */
export interface CRDTEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle: string;
	targetHandle: string;
}

/**
 * Node data for seeding, including pre-computed handles and subtitle.
 */
export interface NodeSeedData extends INode {
	inputs?: ComputedHandle[];
	outputs?: ComputedHandle[];
	/** Pre-computed subtitle from expression evaluation */
	subtitle?: string;
}

/**
 * Data structure for seeding a workflow into a CRDT document.
 */
export interface WorkflowSeedData {
	id: string;
	name: string;
	nodes: NodeSeedData[];
	connections: IConnections;
	settings?: Record<string, unknown>;
	/** Pinned data keyed by node name (will be converted to node ID in CRDT) */
	pinData?: IPinData;
}

// =============================================================================
// Pure Functions
// =============================================================================

/**
 * Normalize raw inputs/outputs into ComputedHandle format.
 * Handles both simple string types and full configuration objects.
 *
 * @param rawHandles - Raw input/output configurations from NodeHelpers
 * @param mode - 'inputs' or 'outputs'
 * @param endpointNames - Optional names for main endpoints (e.g., outputNames like "true"/"false" for If node)
 */
export function normalizeHandles(
	rawHandles: Array<NodeConnectionType | INodeInputConfiguration | INodeOutputConfiguration>,
	mode: 'inputs' | 'outputs',
	endpointNames: string[] = [],
): ComputedHandle[] {
	const handles: ComputedHandle[] = [];

	// Group by type to compute correct indices
	const byType = new Map<string, number>();

	for (let endpointIndex = 0; endpointIndex < rawHandles.length; endpointIndex++) {
		const raw = rawHandles[endpointIndex];
		// Normalize to object form
		const config = typeof raw === 'string' ? { type: raw } : (raw as INodeInputConfiguration);

		const type = config.type;
		const currentIndex = byType.get(type) ?? 0;
		byType.set(type, currentIndex + 1);

		// Use displayName from config, or fall back to endpointNames for main type handles
		const displayName =
			config.displayName ?? (typeof raw === 'string' ? endpointNames[endpointIndex] : undefined);

		handles.push({
			handleId: `${mode}/${type}/${currentIndex}`,
			type,
			mode,
			index: currentIndex,
			displayName,
			required: config.required,
			maxConnections: config.maxConnections,
		});
	}

	return handles;
}

/**
 * Compute subtitle for a node using the same logic as frontend useNodeHelpers.
 * Priority: notesInFlow > nodeType.subtitle expression > operation display name
 *
 * @param workflow - Workflow instance for expression evaluation
 * @param node - The node to compute subtitle for
 * @param nodeType - The node type description
 */
export function computeNodeSubtitle(
	workflow: Workflow,
	node: INode,
	nodeType: INodeTypeDescription,
): string | undefined {
	// 1. Notes in flow
	if (node.notesInFlow && node.notes) {
		return node.notes;
	}

	// 2. Node type subtitle expression
	if (nodeType.subtitle !== undefined) {
		try {
			return workflow.expression.getSimpleParameterValue(
				node,
				nodeType.subtitle,
				'internal',
				{},
				undefined,
				undefined,
			) as string | undefined;
		} catch {
			// Expression evaluation failed, fall through
		}
	}

	// 3. Operation parameter display name
	if (node.parameters?.operation !== undefined) {
		const operation = node.parameters.operation as string;
		const operationProp = nodeType.properties?.find((p) => p.name === 'operation');
		if (operationProp?.options) {
			const option = operationProp.options.find(
				(o) => (o as INodePropertyOptions).value === operation,
			);
			if (option) {
				return (option as INodePropertyOptions).name;
			}
		}
		return operation;
	}

	return undefined;
}

/**
 * Compute input and output handles and subtitle for a single node.
 * Uses NodeHelpers.getNodeInputs/getNodeOutputs which can evaluate expressions.
 *
 * @param workflow - Workflow instance for expression evaluation
 * @param node - The node to compute handles for
 * @param nodeType - The node type description
 */
export function computeNodeHandles(
	workflow: Workflow,
	node: INode,
	nodeType: INodeTypeDescription,
): { inputs: ComputedHandle[]; outputs: ComputedHandle[]; subtitle: string | undefined } {
	// Compute inputs
	const rawInputs = NodeHelpers.getNodeInputs(workflow, node, nodeType);
	const inputs = normalizeHandles(rawInputs, 'inputs');

	// Compute outputs - pass outputNames for main output labels (e.g., "true"/"false" for If node)
	const rawOutputs = NodeHelpers.getNodeOutputs(workflow, node, nodeType);
	const outputs = normalizeHandles(rawOutputs, 'outputs', nodeType.outputNames);

	// Compute subtitle
	const subtitle = computeNodeSubtitle(workflow, node, nodeType);

	return { inputs, outputs, subtitle };
}

/**
 * Compute handles for all nodes in a workflow.
 *
 * @param workflow - Workflow instance
 * @param nodes - Array of nodes to compute handles for
 * @param nodeTypes - NodeTypes service for looking up node type descriptions
 */
export function computeAllNodeHandles(
	workflow: Workflow,
	nodes: INode[],
	nodeTypes: INodeTypes,
): NodeSeedData[] {
	return nodes.map((node) => {
		const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		const nodeTypeDescription = nodeType?.description;

		let inputs: ComputedHandle[] = [];
		let outputs: ComputedHandle[] = [];
		let subtitle: string | undefined;

		if (nodeTypeDescription) {
			const result = computeNodeHandles(workflow, node, nodeTypeDescription);
			inputs = result.inputs;
			outputs = result.outputs;
			subtitle = result.subtitle;
		}

		return {
			...node,
			inputs,
			outputs,
			subtitle,
		} as NodeSeedData;
	});
}

/**
 * Convert IConnections (nested format) to flat edges (Vue Flow format).
 *
 * @param connections - IConnections from workflow
 * @param nodeIdByName - Map from node name to node ID
 * @returns Flat edges array
 */
export function iConnectionsToEdges(
	connections: IConnections,
	nodeIdByName: Map<string, string>,
): CRDTEdge[] {
	const edges: CRDTEdge[] = [];

	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		const sourceId = nodeIdByName.get(sourceName);
		if (!sourceId) continue;

		for (const [type, outputs] of Object.entries(sourceConns)) {
			if (!outputs) continue;

			outputs.forEach((targets, outputIndex) => {
				if (!targets) return;

				targets.forEach((target) => {
					const targetId = nodeIdByName.get(target.node);
					if (!targetId) return;

					const sourceHandle = `outputs/${type}/${outputIndex}`;
					const targetHandle = `inputs/${target.type}/${target.index}`;

					edges.push({
						id: `[${sourceId}/${sourceHandle}][${targetId}/${targetHandle}]`,
						source: sourceId,
						target: targetId,
						sourceHandle,
						targetHandle,
					});
				});
			});
		}
	}

	return edges;
}

// =============================================================================
// CRDT-Dependent Functions (use minimal interfaces)
// =============================================================================

/**
 * Convert a CRDT node map to an INode object.
 * Reads directly from CRDT to get the latest data.
 *
 * @param nodeMap - The CRDT map containing node data
 * @param nodeIdFallback - Optional node ID to use if 'id' is not stored in the map
 */
export function crdtNodeMapToINode(
	nodeMap: CRDTMapLike<unknown>,
	nodeIdFallback?: string,
): INode | null {
	const id = (nodeMap.get('id') as string | undefined) ?? nodeIdFallback;
	const name = nodeMap.get('name') as string | undefined;
	const type = nodeMap.get('type') as string | undefined;
	const typeVersion = nodeMap.get('typeVersion') as number | undefined;
	const position = nodeMap.get('position') as [number, number] | undefined;

	if (!id || !name || !type) return null;

	// Get parameters - handle both CRDTMap and plain object
	const rawParams = nodeMap.get('parameters');
	let parameters: Record<string, unknown> = {};
	if (rawParams && typeof rawParams === 'object') {
		if ('toJSON' in rawParams) {
			parameters = (rawParams as { toJSON(): Record<string, unknown> }).toJSON();
		} else {
			parameters = rawParams as Record<string, unknown>;
		}
	}

	// Get other optional properties
	const disabled = nodeMap.get('disabled') as boolean | undefined;
	const notes = nodeMap.get('notes') as string | undefined;
	const notesInFlow = nodeMap.get('notesInFlow') as boolean | undefined;
	const webhookId = nodeMap.get('webhookId') as string | undefined;
	const credentials = nodeMap.get('credentials') as INode['credentials'] | undefined;

	return {
		id,
		name,
		type,
		typeVersion: typeVersion ?? 1,
		position: position ?? [0, 0],
		parameters,
		disabled,
		notes,
		notesInFlow,
		webhookId,
		credentials,
	} as INode;
}

/**
 * Update handles array in CRDT for a node.
 *
 * @param doc - The CRDT document
 * @param nodeMap - The CRDT map for the node
 * @param key - 'inputs' or 'outputs'
 * @param handles - Array of computed handles to set
 */
export function updateHandlesInCRDT(
	doc: CRDTDocLike,
	nodeMap: CRDTMapLike<unknown>,
	key: 'inputs' | 'outputs',
	handles: ComputedHandle[],
): void {
	// Create new handles array
	// The CRDTDocLike methods return any to be compatible with @n8n/crdt types
	const handlesArray = doc.createArray<unknown>() as CRDTArrayLike<unknown>;
	for (const handle of handles) {
		const handleMap = doc.createMap<unknown>() as CRDTMapLike<unknown>;
		handleMap.set('handleId', handle.handleId);
		handleMap.set('type', handle.type);
		handleMap.set('mode', handle.mode);
		handleMap.set('index', handle.index);
		if (handle.displayName) handleMap.set('displayName', handle.displayName);
		if (handle.required !== undefined) handleMap.set('required', handle.required);
		if (handle.maxConnections !== undefined) handleMap.set('maxConnections', handle.maxConnections);
		handlesArray.push(handleMap);
	}
	nodeMap.set(key, handlesArray);
}

/**
 * Check if a deep change affects parameters.
 * Used for detecting when handle recomputation is needed.
 *
 * @param change - The deep change event
 * @returns True if the change affects node parameters
 */
export function isParameterChange(change: DeepChangeLike): boolean {
	return change.path.length >= 2 && change.path[1] === 'parameters';
}

/**
 * Check if a deep change is a new node addition.
 *
 * @param change - The deep change event
 * @returns True if a new node was added
 */
export function isNodeAddition(change: DeepChangeLike): boolean {
	return change.path.length === 1 && change.action === 'add';
}

/**
 * Type guard to check if a DeepChange is a map change (has 'action' property).
 * Compatible with @n8n/crdt isMapChange.
 */
export function isMapChange(change: DeepChangeLike): boolean {
	return 'action' in change;
}

/** Unsubscribe function type */
type Unsubscribe = () => void;

/**
 * Set up handle recomputation when nodes are added or parameters change.
 * This is necessary because:
 * - Newly added nodes need their handles computed
 * - Handles can be dynamic based on parameter values (e.g., Merge node's numberInputs)
 *
 * This is a shared function used by both:
 * - Server (packages/cli/src/crdt/crdt-websocket.service.ts)
 * - Worker Mode (packages/frontend/editor-ui/src/app/workers/coordinator)
 *
 * @param doc - CRDT document
 * @param workflow - Workflow instance (kept in sync via syncWorkflowWithDoc)
 * @param nodeTypes - Node types service for looking up node type descriptions
 * @returns Unsubscribe function
 */
export function setupHandleRecomputation(
	doc: CRDTDocLike,
	workflow: Workflow,
	nodeTypes: INodeTypes,
): Unsubscribe {
	const nodesMap = doc.getMap<unknown>('nodes') as CRDTMapLike<unknown>;

	// Check if nodesMap supports onDeepChange
	if (!nodesMap.onDeepChange) {
		console.warn('[setupHandleRecomputation] nodesMap.onDeepChange not available');
		return () => {};
	}

	return nodesMap.onDeepChange((changes) => {
		// Track nodes that need handle computation
		const affectedNodeIds = new Set<string>();

		for (const change of changes) {
			// Only process map changes (not array changes)
			if (!isMapChange(change)) continue;

			const nodeId = change.path[0] as string;
			if (!nodeId) continue;

			// Case 1: New node added
			if (isNodeAddition(change)) {
				affectedNodeIds.add(nodeId);
			}
			// Case 2: Parameter changed
			else if (isParameterChange(change)) {
				affectedNodeIds.add(nodeId);
			}
		}

		if (affectedNodeIds.size === 0) return;

		// Recompute handles for affected nodes
		doc.transact(() => {
			for (const nodeId of affectedNodeIds) {
				const nodeMap = nodesMap.get(nodeId) as CRDTMapLike<unknown> | undefined;
				if (!nodeMap) continue;

				// Read node data directly from CRDT
				const node = crdtNodeMapToINode(nodeMap, nodeId);
				if (!node) continue;

				const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
				if (!nodeType?.description) continue;

				// Recompute handles
				const {
					inputs: newInputs,
					outputs: newOutputs,
					subtitle: newSubtitle,
				} = computeNodeHandles(workflow, node, nodeType.description);

				// Update handles in CRDT
				updateHandlesInCRDT(doc, nodeMap, 'inputs', newInputs);
				updateHandlesInCRDT(doc, nodeMap, 'outputs', newOutputs);

				// Compute and store node size based on updated handles
				const size = calculateNodeSize({ inputs: newInputs, outputs: newOutputs });
				nodeMap.set('size', [size.width, size.height]);

				// Update subtitle
				if (newSubtitle !== undefined) {
					nodeMap.set('subtitle', newSubtitle);
				} else {
					nodeMap.delete('subtitle');
				}
			}
		});
	});
}

// =============================================================================
// Document Seeding
// =============================================================================

/**
 * Function type for deep seeding values into CRDT structures.
 * This is provided by @n8n/crdt's seedValueDeep function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SeedValueDeepFn = (doc: CRDTDocLike, value: unknown) => any;

/**
 * Function type for setting nested values in CRDT structures.
 * This is provided by @n8n/crdt's setNestedValue function.
 */
export type SetNestedValueFn = (
	doc: CRDTDocLike,
	root: CRDTMapLike<unknown>,
	path: string[],
	value: unknown,
) => void;

/**
 * Seed a CRDT document with workflow data.
 *
 * This is a shared function used by both:
 * - Server (packages/cli/src/crdt/crdt-state.ts)
 * - Worker Mode (packages/frontend/editor-ui/src/app/workers/coordinator)
 *
 * The seedValueDeep function is passed as a parameter to avoid
 * depending on @n8n/crdt in the n8n-workflow package.
 *
 * @param doc - CRDT document to seed
 * @param workflow - Workflow data with pre-computed handles
 * @param seedValueDeep - Function to deep seed nested values
 */
export function seedWorkflowDoc(
	doc: CRDTDocLike,
	workflow: WorkflowSeedData,
	seedValueDeep: SeedValueDeepFn,
): void {
	// Build node name -> id lookup for edge conversion
	const nodeIdByName = new Map<string, string>();
	for (const node of workflow.nodes) {
		if (node.id && node.name) {
			nodeIdByName.set(node.name, node.id);
		}
	}

	// Convert IConnections to flat edges
	const edges = iConnectionsToEdges(workflow.connections, nodeIdByName);

	doc.transact(() => {
		// Seed workflow metadata
		const meta = doc.getMap<unknown>('meta');
		meta.set('id', workflow.id);
		meta.set('name', workflow.name);
		if (workflow.settings) {
			meta.set('settings', workflow.settings);
		}

		// Seed nodes - each node is a nested CRDTMap for fine-grained updates
		const nodesMap = doc.getMap<unknown>('nodes');
		for (const node of workflow.nodes) {
			if (node.id) {
				// Create a nested CRDTMap for this node
				const nodeMap = doc.createMap<unknown>();
				for (const [key, value] of Object.entries(node)) {
					if (key === 'parameters' && value !== undefined) {
						// Deep seed parameters for fine-grained conflict resolution
						// This allows concurrent edits to different parameter fields
						nodeMap.set(key, seedValueDeep(doc, value));
					} else if ((key === 'inputs' || key === 'outputs') && Array.isArray(value)) {
						// Store pre-computed handles as CRDT arrays
						const handlesArray = doc.createArray<unknown>();
						for (const handle of value as ComputedHandle[]) {
							const handleMap = doc.createMap<unknown>();
							handleMap.set('handleId', handle.handleId);
							handleMap.set('type', handle.type);
							handleMap.set('mode', handle.mode);
							handleMap.set('index', handle.index);
							if (handle.displayName) handleMap.set('displayName', handle.displayName);
							if (handle.required !== undefined) handleMap.set('required', handle.required);
							if (handle.maxConnections !== undefined)
								handleMap.set('maxConnections', handle.maxConnections);
							handlesArray.push(handleMap);
						}
						nodeMap.set(key, handlesArray);
					} else {
						// Other node properties (id, type, name, position, etc.) stored flat
						nodeMap.set(key, value);
					}
				}

				// Compute and store node size based on handles
				const size = calculateNodeSize({
					inputs: node.inputs ?? [],
					outputs: node.outputs ?? [],
				});
				nodeMap.set('size', [size.width, size.height]);

				nodesMap.set(node.id, nodeMap);
			}
		}

		// Seed edges (flat format, Vue Flow compatible)
		const edgesMap = doc.getMap<unknown>('edges');
		for (const edge of edges) {
			const edgeMap = doc.createMap<unknown>();
			edgeMap.set('source', edge.source);
			edgeMap.set('target', edge.target);
			edgeMap.set('sourceHandle', edge.sourceHandle);
			edgeMap.set('targetHandle', edge.targetHandle);
			edgesMap.set(edge.id, edgeMap);
		}

		// Seed pinned data (keyed by node ID, not name)
		// Convert from name-keyed IPinData to ID-keyed CRDT storage
		// Store as plain array (not deep seeded) - pinned data is replaced wholesale, not merged
		if (workflow.pinData) {
			const pinnedDataMap = doc.getMap<unknown>('pinnedData') as CRDTMapLike<unknown>;
			for (const [nodeName, data] of Object.entries(workflow.pinData)) {
				const nodeId = nodeIdByName.get(nodeName);
				if (nodeId && data && data.length > 0) {
					pinnedDataMap.set(nodeId, data);
				}
			}
		}
	});
}

// =============================================================================
// Expression Renaming
// =============================================================================

/**
 * Check if a string is an expression (starts with '=').
 */
function isExpression(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('=');
}

/**
 * Recursively find and update expressions that reference oldName.
 * Only updates the specific paths that changed (fine-grained updates).
 *
 * @param doc - The CRDT document
 * @param nodeMap - The CRDT map for the node
 * @param value - The current value being traversed
 * @param path - Path to the current value (e.g., ['parameters', 'operation'])
 * @param oldName - The old node name to replace
 * @param newName - The new node name
 * @param setNestedValue - Function to set values at specific paths
 */
function updateExpressionsInValue(
	doc: CRDTDocLike,
	nodeMap: CRDTMapLike<unknown>,
	value: unknown,
	path: string[],
	oldName: string,
	newName: string,
	setNestedValue: SetNestedValueFn,
): void {
	if (isExpression(value)) {
		// Check if expression contains the old name
		if (value.includes(oldName)) {
			const updated = applyAccessPatterns(value, oldName, newName);
			console.log('[updateExpressionsInValue] Found expression with oldName:', {
				path,
				value,
				updated,
			});
			if (updated !== value) {
				// Use fine-grained update - only set this specific path
				console.log('[updateExpressionsInValue] Updating expression at path:', path);
				setNestedValue(doc, nodeMap, path, updated);
			}
		}
	} else if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			updateExpressionsInValue(
				doc,
				nodeMap,
				value[i],
				[...path, String(i)],
				oldName,
				newName,
				setNestedValue,
			);
		}
	} else if (value !== null && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		for (const key of Object.keys(obj)) {
			updateExpressionsInValue(
				doc,
				nodeMap,
				obj[key],
				[...path, key],
				oldName,
				newName,
				setNestedValue,
			);
		}
	}
}

/**
 * Set up expression renaming when a node's name changes.
 * Watches for name property changes and updates expressions in ALL nodes
 * that reference the old name.
 *
 * This is a shared function used by both:
 * - Server (packages/cli/src/crdt/crdt-websocket.service.ts)
 * - Worker Mode (packages/frontend/editor-ui/src/app/workers/coordinator)
 *
 * @param doc - CRDT document
 * @param setNestedValue - Function to set nested values in CRDT (from @n8n/crdt)
 * @returns Unsubscribe function
 */
export function setupExpressionRenaming(
	doc: CRDTDocLike,
	setNestedValue: SetNestedValueFn,
): Unsubscribe {
	const nodesMap = doc.getMap<unknown>('nodes') as CRDTMapLike<unknown>;

	// Check if nodesMap supports onDeepChange
	if (!nodesMap.onDeepChange) {
		console.warn('[setupExpressionRenaming] nodesMap.onDeepChange not available');
		return () => {};
	}

	// Track previous names to detect changes
	const previousNames = new Map<string, string>();

	// Initialize previous names from current state
	for (const nodeId of nodesMap.keys()) {
		const nodeMap = nodesMap.get(nodeId) as CRDTMapLike<unknown> | undefined;
		if (nodeMap) {
			const name = nodeMap.get('name') as string | undefined;
			if (name) {
				previousNames.set(nodeId, name);
			}
		}
	}

	console.log(
		'[setupExpressionRenaming] Initialized with names:',
		Array.from(previousNames.entries()),
	);

	return nodesMap.onDeepChange((changes) => {
		console.log('[setupExpressionRenaming] onDeepChange triggered, changes:', changes);

		// Track name changes that need expression updates
		const nameChanges: Array<{ nodeId: string; oldName: string; newName: string }> = [];

		for (const change of changes) {
			// Only process map changes (not array changes)
			if (!isMapChange(change)) continue;

			const [nodeId, prop] = change.path;
			if (typeof nodeId !== 'string') continue;

			// Detect name property changes (could be 'update' or 'add' depending on CRDT implementation)
			if (prop === 'name' && (change.action === 'update' || change.action === 'add')) {
				const oldName = previousNames.get(nodeId);
				const nodeMap = nodesMap.get(nodeId) as CRDTMapLike<unknown> | undefined;
				const newName = nodeMap?.get('name') as string | undefined;

				console.log('[setupExpressionRenaming] Name change detected:', {
					nodeId,
					prop,
					action: change.action,
					oldName,
					newName,
					path: change.path,
				});

				if (oldName && newName && oldName !== newName) {
					nameChanges.push({ nodeId, oldName, newName });
					previousNames.set(nodeId, newName);
				}
			}

			// Handle new node additions - track their name
			if (isNodeAddition(change)) {
				const nodeMap = nodesMap.get(nodeId) as CRDTMapLike<unknown> | undefined;
				const name = nodeMap?.get('name') as string | undefined;
				if (name) {
					previousNames.set(nodeId, name);
					console.log('[setupExpressionRenaming] New node added:', { nodeId, name });
				}
			}
		}

		// Process all name changes
		if (nameChanges.length === 0) {
			console.log('[setupExpressionRenaming] No name changes to process');
			return;
		}

		console.log('[setupExpressionRenaming] Processing name changes:', nameChanges);

		// Optimization: First pass - collect nodes that might have relevant expressions
		// This avoids expensive toJSON() calls on nodes that don't reference the old name
		const nodesToUpdate: Array<{ nodeId: string; nodeMap: CRDTMapLike<unknown> }> = [];

		for (const targetNodeId of nodesMap.keys()) {
			const nodeMap = nodesMap.get(targetNodeId) as CRDTMapLike<unknown> | undefined;
			if (!nodeMap) continue;

			const params = nodeMap.get('parameters');
			if (!params) continue;

			// Quick check: stringify params and see if it contains any of the old names
			// This is cheaper than traversing the whole object for most nodes
			const paramsStr =
				params && typeof params === 'object' && 'toJSON' in params
					? JSON.stringify((params as { toJSON(): unknown }).toJSON())
					: JSON.stringify(params);

			// Check if this node might reference any of the renamed nodes
			const mightHaveReferences = nameChanges.some(({ oldName }) => paramsStr.includes(oldName));

			if (mightHaveReferences) {
				nodesToUpdate.push({ nodeId: targetNodeId, nodeMap });
			}
		}

		if (nodesToUpdate.length === 0) {
			console.log('[setupExpressionRenaming] No nodes reference the renamed node(s)');
			return;
		}

		console.log(
			'[setupExpressionRenaming] Found nodes that may reference renamed node:',
			nodesToUpdate.map((n) => n.nodeId),
		);

		// Second pass - update only the nodes that have references
		doc.transact(() => {
			for (const { oldName, newName } of nameChanges) {
				for (const { nodeMap } of nodesToUpdate) {
					const params = nodeMap.get('parameters');
					if (!params) continue;

					// Convert to plain object for traversal
					const paramsJson =
						params && typeof params === 'object' && 'toJSON' in params
							? (params as { toJSON(): Record<string, unknown> }).toJSON()
							: (params as Record<string, unknown>);

					if (paramsJson && typeof paramsJson === 'object') {
						updateExpressionsInValue(
							doc,
							nodeMap,
							paramsJson,
							['parameters'],
							oldName,
							newName,
							setNestedValue,
						);
					}
				}
			}
		});
	});
}
