import type fc from 'fast-check';

import type { ParityRules } from '../rules';

/**
 * How the combinators can use a node:
 * - `plain`: one input, and output 0 continues.
 * - `if`, `switch`: route items to more than one output.
 * - `merge`: two inputs.
 * - `loop`: Split In Batches.
 * - `trigger`: only the generator places triggers. No combinator uses them.
 */
export type NodeRole = 'plain' | 'if' | 'switch' | 'merge' | 'loop' | 'trigger';

/**
 * Node parameters with holes. A hole becomes a string when the node is placed,
 * because only then are the upstream nodes known:
 * - `{ $expr }`: an n8n expression, `={{ … }}`.
 * - `{ $jsonTemplate }`: the JSON output of a Set node in raw mode.
 * - `{ $outputIndex }`: the output expression of a Switch node in expression mode.
 */
export type ParamDraft = Record<string, unknown>;

export interface GenContext {
	rules: ParityRules;
}

export interface CatalogEntry {
	id: string;
	type: string;
	version: number;
	role: NodeRole;
	inputs: number;
	/** Switch depends on its parameters. The function also accepts a draft. */
	outputs: number | ((params: Record<string, unknown>) => number);
	params: (ctx: GenContext) => fc.Arbitrary<ParamDraft>;
	deterministic: true;
	/** Raises L3 (item order) from a warning to a failure for this node. */
	orderSensitive?: boolean;
}

export function outputCount(entry: CatalogEntry, params: Record<string, unknown>): number {
	return typeof entry.outputs === 'number' ? entry.outputs : entry.outputs(params);
}
