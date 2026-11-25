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

	it('fails when an engine skips a node on every path to the shared failure', () => {
		const linear = handWrittenCases['linear pipeline with references'];
		const error = { node: 'B', class: 'NodeOperationError' };
		const run = { outputs: [[{ a: 1 }]], pairedItem: [[null]], failed: false };
		const failedRun = { outputs: [], pairedItem: [], failed: true };
		const v1 = outcome({
			status: 'error',
			error,
			terminal: [],
			nodes: { Trigger: [run], A: [run], B: [failedRun] },
			runOrder: ['Trigger#0', 'A#0', 'B#0'],
		});
		const v2 = outcome({
			status: 'error',
			error,
			terminal: [],
			nodes: { Trigger: [run], B: [failedRun] },
			runOrder: ['Trigger#0', 'B#0'],
		});

		expect(
			compare(v1, v2, linear, rules).map(
				({ level, kind, severity }) => `${level}.${kind}.${severity}`,
			),
		).toEqual(['L2.nodeRan.fail']);

		// A failing node that is not in the graph says nothing about the paths to it.
		const outside = { node: 'Outside', class: 'NodeOperationError' };
		expect(
			compare({ ...v1, error: outside }, { ...v2, error: outside }, linear, rules).map(
				({ level, kind, severity }) => `${level}.${kind}.${severity}`,
			),
		).toEqual(['L3.nodeRanByOrder.warning']);
	});

	it('reports a run that failed on one engine only as L2, even with the same items', () => {
		const failed = outcome();
		failed.nodes.Join[0].failed = true;

		expect(kinds(outcome(), failed)).toEqual(['L2.runFailed.fail']);
	});

	it('reports an error that only one engine describes as L0', () => {
		const error = { node: 'Join', class: 'NodeOperationError' };
		const v1 = outcome({ status: 'error', error });
		const v2 = outcome({ status: 'error' });

		expect(kinds(v1, v2)).toEqual(['L0.error.fail']);
	});

	it('writes items with sorted keys', () => {
		expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
	});
});
