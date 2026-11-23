import { checkEngineV2Eligibility } from '@n8n/workflow-engine-check';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { toSdkCode } from '../compile/to-sdk';
import { parityCaseArb } from './arbitrary';
import { getEntry, outputCount } from './catalog';
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
		const outputs = outputCount(getEntry(from.catalogId), from.params);
		return edge.out < outputs && edge.in < getEntry(to.catalogId).inputs;
	});
}

describe('grammar', () => {
	it('gives the same workflow JSON for the same seed', () => {
		const first = sample('smoke', 7, 20).map((parityCase) => JSON.stringify(parityCase.workflow));
		const second = sample('smoke', 7, 20).map((parityCase) => JSON.stringify(parityCase.workflow));

		expect(second).toEqual(first);
	});

	it.each(['smoke'])('makes eligible workflows with valid ports for the "%s" rule set', (name) => {
		const cases = sample(name);
		const eligible = cases.filter(
			(parityCase) => checkEngineV2Eligibility(parityCase.workflow).eligible,
		);

		expect(cases.every(portsInRange)).toBe(true);
		expect(eligible.length / cases.length).toBeGreaterThanOrEqual(0.95);
	});

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

	it('refers to upstream nodes in expressions', () => {
		const references = sample('smoke').flatMap(
			(parityCase) => JSON.stringify(parityCase.workflow.nodes).match(/\$\(\\"[^\\]+\\"\)/g) ?? [],
		);

		expect(references.length).toBeGreaterThan(0);
	});

	it('makes cases that the SDK can print as code', () => {
		for (const parityCase of sample('smoke', 3, 20)) {
			expect(toSdkCode(parityCase.ir)).toContain("workflow('parity'");
		}
	});
});
