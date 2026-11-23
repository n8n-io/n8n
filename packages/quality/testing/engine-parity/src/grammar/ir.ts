import type { IWorkflowBase } from 'n8n-workflow';

/** The structure combinators. Each one places nodes and edges in the IR. */
export type CombinatorId = 'chain' | 'branch' | 'fanOut' | 'merge' | 'trigger';

export type IrItem = { json: Record<string, unknown> };

export type IrNode = {
	/** Unique in the case. It becomes the node name. */
	key: string;
	/** The catalog entry, for example `set.manual` or `if.condition`. */
	catalogId: string;
	params: Record<string, unknown>;
	flags?: { disabled?: boolean };
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
