import type { INodeExecutionData } from '../src/interfaces';
import { PairedItemMemo, pairedItemStateKey } from '../src/workflow-data-proxy-paired-item-memo';

describe('PairedItemMemo', () => {
	const source = { previousNode: 'A', previousNodeRun: 1, previousNodeOutput: 2 };
	const item: INodeExecutionData = { json: {} };
	const key = pairedItemStateKey(source, { item: 0 });

	test('replays a memoized result', () => {
		const memo = new PairedItemMemo();

		memo.set(key, { ok: true, result: item });
		expect(memo.get(key)).toEqual({ ok: true, result: item });
	});

	test('replays a memoized error', () => {
		const memo = new PairedItemMemo();
		const error = new Error('boom');

		memo.set(key, { ok: false, error });
		expect(memo.get(key)).toEqual({ ok: false, error });
	});

	test('returns undefined for a state it has not seen', () => {
		expect(new PairedItemMemo().get(key)).toBeUndefined();
	});
});

describe('pairedItemStateKey', () => {
	const source = { previousNode: 'A', previousNodeRun: 1, previousNodeOutput: 2 };

	test('treats omitted run and output as 0', () => {
		expect(pairedItemStateKey({ previousNode: 'A' }, { item: 0 })).toBe(
			pairedItemStateKey(
				{ previousNode: 'A', previousNodeRun: 0, previousNodeOutput: 0 },
				{ item: 0 },
			),
		);
	});

	test.each([
		['node', { ...source, previousNode: 'B' }, { item: 0 }],
		['run', { ...source, previousNodeRun: 0 }, { item: 0 }],
		['output', { ...source, previousNodeOutput: 0 }, { item: 0 }],
		['item', source, { item: 1 }],
	])('keys a different %s as a distinct state', (_, otherSource, otherItem) => {
		expect(pairedItemStateKey(otherSource, otherItem)).not.toBe(
			pairedItemStateKey(source, { item: 0 }),
		);
	});
});
