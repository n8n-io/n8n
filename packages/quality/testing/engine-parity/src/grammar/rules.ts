import type { CombinatorId } from './ir';

export type Severity = 'fail' | 'warning';

export interface ParityRules {
	name: string;
	/** The catalog entries the generator can use. */
	nodes: string[];
	/** The structure combinators the generator can use. */
	combinators: CombinatorId[];
	limits: {
		/** Maximum nesting depth of combinators. */
		depth: number;
		/** Maximum count of nodes, triggers included. */
		nodes: number;
		/** Maximum count of branches or chain steps in one combinator. */
		width: number;
		/** Maximum count of trigger items. */
		items: number;
	};
	features: {
		/** Split In Batches loops (the `loop` combinator). */
		loops: boolean;
		/** `onError: continueErrorOutput` (the `errorOutput` combinator). */
		errorOutputs: boolean;
	};
	expressions: {
		/** The part of node references that name a node that did not run. From 0 to 1. */
		ghostRate: number;
	};
	severity: { L3: Severity; L4: Severity };
}

const FIRST_SET = [
	'set.manual',
	'set.raw',
	'if.condition',
	'switch.rules',
	'switch.expression',
	'merge.append',
	'merge.combineByPosition',
	'merge.combineByFields',
	'splitOut',
	'filter',
	'aggregate.fields',
	'aggregate.all',
	'sort',
	'limit',
	'noOp',
];

const base: Omit<ParityRules, 'name'> = {
	nodes: ['set.manual', 'set.raw', 'if.condition', 'merge.append', 'splitOut', 'noOp'],
	combinators: ['chain', 'branch', 'fanOut', 'merge'],
	limits: { depth: 4, nodes: 12, width: 3, items: 5 },
	features: { loops: false, errorOutputs: false },
	expressions: { ghostRate: 0.05 },
	severity: { L3: 'warning', L4: 'warning' },
};

/** Named rule sets. `PARITY_RULES` selects one or more of them, separated by commas. */
export const ruleSets: Record<string, ParityRules> = {
	smoke: { name: 'smoke', ...base },
	branching: {
		...base,
		name: 'branching',
		nodes: FIRST_SET,
		combinators: ['chain', 'branch', 'switch', 'fanOut', 'merge'],
	},
	loops: {
		...base,
		name: 'loops',
		nodes: [...base.nodes, 'splitInBatches'],
		combinators: ['chain', 'branch', 'merge', 'loop'],
		features: { ...base.features, loops: true },
	},
	errorOutputs: {
		...base,
		name: 'errorOutputs',
		combinators: ['chain', 'branch', 'errorOutput'],
		features: { ...base.features, errorOutputs: true },
		expressions: { ghostRate: 0.3 },
	},
	code: {
		...base,
		name: 'code',
		nodes: [...base.nodes, 'code.allItems', 'code.eachItem'],
	},
	subWorkflows: {
		...base,
		name: 'subWorkflows',
		nodes: [...base.nodes, 'executeWorkflow'],
		combinators: ['chain', 'branch', 'merge', 'subWorkflow'],
	},
};

/** The rule sets that `PARITY_RULES` names. The default is `smoke`. */
export function selectRuleSets(selection = process.env.PARITY_RULES || 'smoke'): ParityRules[] {
	const names = selection
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean);
	return names.map((name) => {
		const rules = ruleSets[name];
		if (!rules) {
			throw new Error(
				`Unknown rule set "${name}". Known rule sets: ${Object.keys(ruleSets).join(', ')}`,
			);
		}
		return rules;
	});
}
