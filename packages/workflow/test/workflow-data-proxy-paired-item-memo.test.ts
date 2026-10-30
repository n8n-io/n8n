import type { INodeExecutionData } from '../src/interfaces';
import { PairedItemMemo } from '../src/workflow-data-proxy-paired-item-memo';

describe('PairedItemMemo', () => {
	const source = { previousNode: 'A', previousNodeRun: 1, previousNodeOutput: 2 };
	const item: INodeExecutionData = { json: {} };

	test('replays a memoized result', () => {
		const memo = new PairedItemMemo();

		memo.set(source, { item: 0 }, { ok: true, result: item });
		expect(memo.get(source, { item: 0 })).toEqual({ ok: true, result: item });
	});

	test('replays a memoized error', () => {
		const memo = new PairedItemMemo();
		const error = new Error('boom');

		memo.set(source, { item: 0 }, { ok: false, error });
		expect(memo.get(source, { item: 0 })).toEqual({ ok: false, error });
	});

	test('returns undefined for a state it has not seen', () => {
		expect(new PairedItemMemo().get(source, { item: 0 })).toBeUndefined();
	});

	test('treats omitted run and output as 0', () => {
		const memo = new PairedItemMemo();

		memo.set({ previousNode: 'A' }, { item: 0 }, { ok: true, result: item });
		expect(
			memo.get({ previousNode: 'A', previousNodeRun: 0, previousNodeOutput: 0 }, { item: 0 }),
		).toBeDefined();
	});

	test.each([
		['node', { ...source, previousNode: 'B' }, { item: 0 }],
		['run', { ...source, previousNodeRun: 0 }, { item: 0 }],
		['output', { ...source, previousNodeOutput: 0 }, { item: 0 }],
		['item', source, { item: 1 }],
	])('keys a different %s as a distinct state', (_, otherSource, otherItem) => {
		const memo = new PairedItemMemo();

		memo.set(source, { item: 0 }, { ok: true, result: item });
		expect(memo.get(otherSource, otherItem)).toBeUndefined();
	});
});
