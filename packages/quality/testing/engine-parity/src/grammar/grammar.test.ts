import { checkEngineV2Eligibility } from '@n8n/workflow-engine-check';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { toSdkCode } from '../compile/to-sdk';
import { generatedCaseArb, parityCaseArb } from './arbitrary';
import { getEntry, outputCount } from './catalog';
import type { Block } from './combinators';
import type { ParityCase } from './ir';
import { ruleSets } from './rules';

const sample = (name: string, seed = 42, numRuns = 100) =>
	fc.sample(parityCaseArb(ruleSets[name]), { seed, numRuns });

function portsInRange({ ir }: ParityCase): boolean {
	const nodes = new Map([...ir.triggers, ...ir.nodes].map((irNode) => [irNode.key, irNode]));
	return ir.edges.every((edge) => {
		const from = nodes.get(edge.from);
		const to = nodes.get(edge.to);
		if (!from || !to) return false;
		const outputs =
			outputCount(getEntry(from.catalogId), from.params) + (from.flags?.onError ? 1 : 0);
		const inputs = getEntry(to.catalogId).inputs;
		return edge.out >= 0 && edge.out < outputs && edge.in >= 0 && edge.in < inputs;
	});
}

/** The nodes that reach `key` along the edges. With `forward`, the nodes that `key` reaches. */
function reachable(key: string, ir: ParityCase['ir'], forward: boolean): Set<string> {
	const found = new Set<string>();
	const queue = [key];
	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const edge of ir.edges) {
			const [here, next] = forward ? [edge.from, edge.to] : [edge.to, edge.from];
			if (here === current && !found.has(next)) {
				found.add(next);
				queue.push(next);
			}
		}
	}
	return found;
}

function referencedNodes(params: unknown): string[] {
	return [...JSON.stringify(params).matchAll(/\$\(\\"([^\\]+)\\"\)/g)].map((match) => match[1]);
}

describe('grammar', () => {
	it('gives the same workflow JSON for the same seed', () => {
		const first = sample('branching', 7, 20).map((parityCase) =>
			JSON.stringify(parityCase.workflow),
		);
		const second = sample('branching', 7, 20).map((parityCase) =>
			JSON.stringify(parityCase.workflow),
		);

		expect(second).toEqual(first);
	});

	it.each(['smoke', 'branching', 'loops', 'code', 'subWorkflows', 'multiTrigger'])(
		'makes eligible workflows with valid ports for the "%s" rule set',
		(name) => {
			const cases = sample(name);
			// The combinators make every shape eligible, so one rejected case is a bug.
			const rejected = cases
				.flatMap((parityCase) => [parityCase.workflow, ...Object.values(parityCase.subWorkflows)])
				.map((workflow) => checkEngineV2Eligibility(workflow))
				.filter((result) => !result.eligible);

			expect(cases.every(portsInRange)).toBe(true);
			expect(rejected).toEqual([]);
		},
	);

	it('keeps each case within the node limit', () => {
		const { limits } = ruleSets.smoke;
		for (const parityCase of sample('smoke')) {
			expect(parityCase.workflow.nodes.length).toBeLessThanOrEqual(limits.nodes);
		}
	});

	it('uses only the nodes that the rules allow', () => {
		const allowed = new Set(ruleSets.smoke.nodes);
		for (const parityCase of sample('smoke')) {
			for (const irNode of parityCase.ir.nodes) expect(allowed).toContain(irNode.catalogId);
		}
	});

	it('refers to upstream nodes in expressions, and never to a parallel branch', () => {
		let upstreamReferences = 0;
		let nonTriggerReferences = 0;
		for (const { ir } of sample('smoke')) {
			for (const irNode of ir.nodes) {
				const ancestors = reachable(irNode.key, ir, false);
				const descendants = reachable(irNode.key, ir, true);
				for (const name of referencedNodes(irNode.params)) {
					if (ancestors.has(name)) {
						upstreamReferences++;
						if (name !== ir.firedTrigger) nonTriggerReferences++;
					} else {
						expect(name === 'Ghost' || descendants.has(name)).toBe(true);
					}
				}
			}
		}

		expect(upstreamReferences).toBeGreaterThan(0);
		// Most nodes have more than one upstream node, so nodes other than the trigger get a fair part.
		expect(nonTriggerReferences / upstreamReferences).toBeGreaterThanOrEqual(0.2);
	});

	it('uses every combinator that the rules allow', () => {
		const used = new Set<string>();
		const visit = (block: Block | null): void => {
			if (!block) return;
			used.add(block.kind);
			if (block.kind === 'chain') block.blocks.forEach(visit);
			if (block.kind === 'fanOut') block.targets.forEach(visit);
			if (block.kind === 'branch') [block.onTrue, block.onFalse].forEach(visit);
			if (block.kind === 'merge') [block.left, block.right].forEach(visit);
		};
		const generated = fc.sample(generatedCaseArb(ruleSets.smoke), { seed: 42, numRuns: 100 });
		for (const { main } of generated) visit(main);

		for (const combinator of ruleSets.smoke.combinators) expect(used).toContain(combinator);
	});

	it('makes If nodes in both case modes, with the filter in agreement with the node option', () => {
		const modes = new Set<boolean>();
		for (const { ir } of sample('smoke')) {
			for (const irNode of ir.nodes.filter(({ catalogId }) => catalogId === 'if.condition')) {
				const { conditions, options } = irNode.params as {
					conditions: { options: { caseSensitive: boolean } };
					options: { ignoreCase: boolean };
				};
				expect(conditions.options.caseSensitive).toBe(!options.ignoreCase);
				modes.add(conditions.options.caseSensitive);
			}
		}

		expect([...modes].sort()).toEqual([false, true]);
	});

	it.each(['code', 'subWorkflows', 'multiTrigger'])(
		'makes cases that the SDK can print as code for the "%s" rule set',
		(name) => {
			for (const parityCase of sample(name, 3, 20)) {
				expect(toSdkCode(parityCase.ir)).toContain("workflow('parity'");
			}
		},
	);

	it('gives each Execute Workflow node its own sub-workflow, nested calls included', () => {
		const calls = (parityCase: ParityCase) =>
			[parityCase.ir, ...Object.values(parityCase.ir.subWorkflows ?? {})].flatMap((ir) =>
				ir.nodes.filter((irNode) => irNode.catalogId === 'executeWorkflow'),
			);
		const cases = sample('subWorkflows').filter((parityCase) => calls(parityCase).length > 0);

		expect(cases.length).toBeGreaterThan(0);
		const nested = cases.some((parityCase) =>
			Object.values(parityCase.ir.subWorkflows ?? {}).some((sub) =>
				sub.nodes.some((irNode) => irNode.catalogId === 'executeWorkflow'),
			),
		);
		expect(nested).toBe(true);
		for (const parityCase of cases) {
			for (const irNode of calls(parityCase)) {
				expect(parityCase.subWorkflows[String(irNode.params.workflowId)]).toBeDefined();
			}
		}
	});
});
