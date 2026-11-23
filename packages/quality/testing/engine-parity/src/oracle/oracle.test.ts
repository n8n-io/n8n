import { describe, expect, it } from 'vitest';

import { handWrittenCases } from '../fixtures/hand-written';
import { ruleSets } from '../grammar/rules';
import { compare } from './compare';
import type { Outcome } from './normalize';
import { canonical } from './normalize';

const parityCase = handWrittenCases['if into merge'];
const rules = ruleSets.smoke;

function outcome(overrides: Partial<Outcome> = {}): Outcome {
	return {
		status: 'success',
		terminal: [{ size: 'big' }, { size: 'small' }],
		nodes: {
			Trigger: [{ outputs: [[{ n: 1 }]], pairedItem: [[null]], failed: false }],
			Join: [
				{
					outputs: [[{ size: 'big' }, { size: 'small' }]],
					pairedItem: [[{ item: 0 }, { item: 0, input: 1 }]],
					failed: false,
				},
			],
		},
		runOrder: ['Trigger#0', 'Join#0'],
		...overrides,
	};
}

const kinds = (v1: Outcome, v2: Outcome) =>
	compare(v1, v2, parityCase, rules).map(
		({ level, kind, severity }) => `${level}.${kind}.${severity}`,
	);

describe('oracle', () => {
	it('finds no difference in equal outcomes', () => {
		expect(kinds(outcome(), outcome())).toEqual([]);
	});

	it('reports a status difference as L0', () => {
		const failed = outcome({
			status: 'error',
			error: { node: 'Join', class: 'NodeOperationError' },
		});

		expect(kinds(outcome(), failed)).toContain('L0.status.fail');
	});

	it('compares items as a multiset at L2, and their order at L3', () => {
		const reordered = outcome();
		reordered.nodes.Join[0].outputs = [[{ size: 'small' }, { size: 'big' }]];
		const changed = outcome();
		changed.nodes.Join[0].outputs = [[{ size: 'big' }, { size: 'big' }]];

		expect(kinds(outcome(), reordered)).toEqual(['L3.itemOrder.warning']);
		expect(kinds(outcome(), changed)).toEqual(['L2.items.fail']);
	});

	it('reports a pairedItem difference as an L4 warning, except for the trigger', () => {
		const relinked = outcome();
		relinked.nodes.Join[0].pairedItem = [[{ item: 0 }, { item: 0 }]];
		relinked.nodes.Trigger[0].pairedItem = [[{ item: 0 }]];

		expect(kinds(outcome(), relinked)).toEqual(['L4.pairedItem.warning']);
	});

	it('reports a different run order as an L3 warning', () => {
		expect(kinds(outcome(), outcome({ runOrder: ['Join#0', 'Trigger#0'] }))).toEqual([
			'L3.runOrder.warning',
		]);
	});

	it('treats the nodes that ran before a shared failure as L3', () => {
		const error = { node: 'Join', class: 'NodeOperationError' };
		const v1 = outcome({ status: 'error', error });
		const v2 = outcome({ status: 'error', error });
		v2.nodes.Extra = [{ outputs: [[{ a: 1 }]], pairedItem: [[null]], failed: false }];
		v2.terminal = [...v2.terminal, { a: 1 }];

		expect(kinds(v1, v2).sort()).toEqual([
			'L3.nodeRanByOrder.warning',
			'L3.terminalByOrder.warning',
		]);
	});

	it('writes items with sorted keys', () => {
		expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
	});
});
