import { ifCondition } from './if';
import { mergeAppend } from './merge';
import { noOp } from './no-op';
import { setManual, setRaw } from './set';
import { splitOut } from './split-out';
import { manualTrigger } from './triggers';
import type { CatalogEntry, NodeRole } from './types';

export type { CatalogEntry, GenContext, NodeRole, ParamDraft } from './types';
export { outputCount } from './types';

const entries: CatalogEntry[] = [
	setManual,
	setRaw,
	ifCondition,
	mergeAppend,
	splitOut,
	noOp,
	manualTrigger,
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
