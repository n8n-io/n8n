import { generateWorkflowCode, node, trigger, workflow } from '@n8n/workflow-sdk';
import type { IDataObject as SdkDataObject, NodeInstance, WorkflowJSON } from '@n8n/workflow-sdk';
import { jsonParse, NodeConnectionTypes } from 'n8n-workflow';
import type { IConnections, INode, INodeParameters, IWorkflowBase } from 'n8n-workflow';

import { getEntry } from '../grammar/catalog';
import type { IrNode, IrWorkflow } from '../grammar/ir';

const X_SPACING = 220;
const Y_SPACING = 160;

/**
 * Canvas positions. The converter and engine v1 both order branches by
 * position, so positions must be the same for one IR. A node goes one column
 * to the right of its deepest predecessor. Back edges do not count.
 */
function positions(ir: IrWorkflow): Map<string, [number, number]> {
	const order = [...ir.triggers, ...ir.nodes].map((irNode) => irNode.key);
	const rank = new Map(order.map((key, i) => [key, i]));
	const column = new Map<string, number>(order.map((key) => [key, 0]));
	for (const key of order) {
		for (const edge of ir.edges) {
			if (edge.from !== key) continue;
			// Only forward edges, in creation order, so cycles cannot loop here.
			if ((rank.get(edge.to) ?? -1) <= (rank.get(key) ?? 0)) continue;
			column.set(edge.to, Math.max(column.get(edge.to) ?? 0, (column.get(key) ?? 0) + 1));
		}
	}
	const rowsUsed = new Map<number, number>();
	const result = new Map<string, [number, number]>();
	for (const key of order) {
		const col = column.get(key) ?? 0;
		const row = rowsUsed.get(col) ?? 0;
		rowsUsed.set(col, row + 1);
		result.set(key, [col * X_SPACING, row * Y_SPACING]);
	}
	return result;
}

function toHandle(irNode: IrNode, position: [number, number], isTrigger: boolean) {
	const entry = getEntry(irNode.catalogId);
	const config = {
		name: irNode.key,
		// The IR holds JSON only, which is what the SDK type describes.
		parameters: irNode.params as SdkDataObject,
		position,
		...(irNode.flags?.onError ? { onError: irNode.flags.onError } : {}),
		...(irNode.flags?.disabled ? { disabled: true } : {}),
	};
	return isTrigger
		? trigger({ type: entry.type, version: entry.version, config })
		: node({ type: entry.type, version: entry.version, config });
}

/** The SDK keeps its own copy of the n8n-workflow types. The generator uses `main` connections only. */
function toConnections(json: WorkflowJSON): IConnections {
	const connections: IConnections = {};
	for (const [source, byType] of Object.entries(json.connections)) {
		connections[source] = {
			main: (byType.main ?? []).map(
				(slot) =>
					slot?.map((target) => ({
						node: target.node,
						type: NodeConnectionTypes.Main,
						index: target.index,
					})) ?? null,
			),
		};
	}
	return connections;
}

function toWorkflowBase(json: WorkflowJSON, id: string): IWorkflowBase {
	const nodes: INode[] = json.nodes.map((sdkNode) => ({
		id: sdkNode.id,
		name: sdkNode.name ?? sdkNode.id,
		type: sdkNode.type,
		typeVersion: sdkNode.typeVersion,
		position: sdkNode.position,
		parameters: jsonParse<INodeParameters>(JSON.stringify(sdkNode.parameters ?? {})),
		...(sdkNode.onError ? { onError: sdkNode.onError } : {}),
		...(sdkNode.disabled ? { disabled: true } : {}),
	}));
	const connections = toConnections(json);
	return {
		id,
		name: json.name,
		active: false,
		isArchived: false,
		activeVersionId: null,
		createdAt: new Date(0),
		updatedAt: new Date(0),
		nodes,
		connections,
		settings: { executionOrder: 'v1' },
	};
}

/** Builds the workflow with the SDK. The same IR always gives the same JSON. */
export function compile(ir: IrWorkflow, id = 'parity'): IWorkflowBase {
	return toWorkflowBase(compileToSdkJson(ir, id), id);
}

/** The SDK code of the workflow, for repro files. */
export function toSdkCode(ir: IrWorkflow, id = 'parity'): string {
	return generateWorkflowCode(compileToSdkJson(ir, id));
}

export function compileToSdkJson(ir: IrWorkflow, id = 'parity'): WorkflowJSON {
	const wf = workflow(id, id, { settings: { executionOrder: 'v1' } });
	const layout = positions(ir);
	const handles = new Map<string, NodeInstance<string, string, unknown>>();

	for (const irNode of ir.triggers) {
		handles.set(irNode.key, toHandle(irNode, layout.get(irNode.key) ?? [0, 0], true));
	}
	for (const irNode of ir.nodes) {
		handles.set(irNode.key, toHandle(irNode, layout.get(irNode.key) ?? [0, 0], false));
	}
	for (const handle of handles.values()) wf.add(handle);
	for (const edge of ir.edges) {
		const from = handles.get(edge.from);
		const to = handles.get(edge.to);
		if (!from || !to)
			throw new Error(`The IR has an edge to an unknown node: ${JSON.stringify(edge)}`);
		wf.connect(from, edge.out, to, edge.in);
	}
	wf.regenerateNodeIds();
	return wf.toJSON();
}
