import type { IWorkflowBase } from 'n8n-workflow';

/**
 * The intermediate representation (IR) of one generated workflow.
 *
 * The generator works in three steps:
 * 1. fast-check generates a `Block` tree. The tree holds only decisions, so
 *    fast-check can shrink it.
 * 2. `toIr` lowers the tree to the IR: named nodes with final parameters,
 *    numbered edges, and the trigger items.
 * 3. `compile` builds the workflow JSON from the IR with the workflow SDK.
 *
 * Why the IR exists:
 * - It is plain JSON, so it is easy to print, compare and store.
 * - It does not depend on the SDK or on the workflow JSON format.
 * - It keeps data that the workflow JSON does not hold: the trigger items, the
 *   fired trigger, and the combinator that placed each node.
 * - Checks such as port ranges read the IR directly. They do not parse
 *   the workflow JSON.
 */

/** The structure combinators. Each one places nodes and edges in the IR. */
export type CombinatorId =
	| 'chain'
	| 'branch'
	| 'switch'
	| 'fanOut'
	| 'merge'
	| 'loop'
	| 'errorOutput'
	| 'trigger';

export type IrItem = { json: Record<string, unknown> };

export type IrNode = {
	/** Unique in the case. It becomes the node name. */
	key: string;
	/** The catalog entry, for example `set.manual` or `if.condition`. */
	catalogId: string;
	params: Record<string, unknown>;
	flags?: { disabled?: boolean; onError?: 'continueErrorOutput' };
	/** The combinator that placed the node. Signatures and coverage use it. */
	via: CombinatorId;
};

export type IrEdge = { from: string; out: number; to: string; in: number };

export type IrWorkflow = {
	triggers: IrNode[];
	nodes: IrNode[];
	edges: IrEdge[];
	triggerItems: IrItem[];
	/** The trigger that fires. It is required when there are many triggers. */
	firedTrigger: string;
};

export type ParityCase = {
	seed?: number;
	ir: IrWorkflow;
	workflow: IWorkflowBase;
};
