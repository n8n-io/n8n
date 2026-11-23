import { aggregateAll, aggregateFields } from './aggregate';
import { codeAllItems, codeEachItem } from './code';
import { executeWorkflow } from './execute-workflow';
import { filter } from './filter';
import { ifCondition } from './if';
import { limit } from './limit';
import { mergeAppend, mergeCombineByFields, mergeCombineByPosition } from './merge';
import { noOp } from './no-op';
import { setManual, setRaw } from './set';
import { sort } from './sort';
import { splitInBatches } from './split-in-batches';
import { splitOut } from './split-out';
import { switchExpression, switchRules } from './switch';
import { executeWorkflowTrigger, manualTrigger } from './triggers';
import type { CatalogEntry, NodeRole } from './types';

export type { CatalogEntry, CodeSpec, GenContext, NodeRole, ParamDraft } from './types';
export { outputCount } from './types';

const entries: CatalogEntry[] = [
	setManual,
	setRaw,
	ifCondition,
	switchRules,
	switchExpression,
	mergeAppend,
	mergeCombineByPosition,
	mergeCombineByFields,
	splitOut,
	filter,
	aggregateFields,
	aggregateAll,
	sort,
	limit,
	noOp,
	splitInBatches,
	codeAllItems,
	codeEachItem,
	executeWorkflow,
	manualTrigger,
	executeWorkflowTrigger,
];

export const catalog = new Map(entries.map((entry) => [entry.id, entry]));

export function getEntry(id: string): CatalogEntry {
	const entry = catalog.get(id);
	if (!entry) throw new Error(`Unknown catalog entry "${id}"`);
	return entry;
}

/** The entries with the role that the rules allow. */
export function allowedEntries(nodes: string[], role: NodeRole): CatalogEntry[] {
	return nodes.map(getEntry).filter((entry) => entry.role === role);
}

/** The node types and versions that the catalog uses, for the node registry. */
export function catalogNodeTypes(): Array<{ type: string; version: number }> {
	return entries.map(({ type, version }) => ({ type, version }));
}
