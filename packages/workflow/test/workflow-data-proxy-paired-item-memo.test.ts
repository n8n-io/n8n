import type { INodeExecutionData } from '../src/interfaces';
import { PairedItemMemo } from '../src/workflow-data-proxy-paired-item-memo';

describe('PairedItemMemo', () => {
	const source = { previousNode: 'A', previousNodeRun: 1, previousNodeOutput: 2 };
	const item: INodeExecutionData = { json: {} };

	test('computes once per state and replays the result', () => {
		const memo = new PairedItemMemo();
		const compute = vi.fn(() => item);

		expect(memo.resolve(source, { item: 0 }, compute)).toBe(item);
		expect(memo.resolve(source, { item: 0 }, compute)).toBe(item);
		expect(compute).toHaveBeenCalledTimes(1);
	});

	test('replays the same error without recomputing', () => {
		const memo = new PairedItemMemo();
		const error = new Error('boom');
		const compute = vi.fn(() => {
			throw error;
		});

		expect(() => memo.resolve(source, { item: 0 }, compute)).toThrow(error);
		expect(() => memo.resolve(source, { item: 0 }, compute)).toThrow(error);
		expect(compute).toHaveBeenCalledTimes(1);
	});

	test('treats omitted run and output as 0', () => {
		const memo = new PairedItemMemo();
		const compute = vi.fn(() => item);

		memo.resolve({ previousNode: 'A' }, { item: 0 }, compute);
		memo.resolve(
			{ previousNode: 'A', previousNodeRun: 0, previousNodeOutput: 0 },
			{ item: 0 },
			compute,
		);
		expect(compute).toHaveBeenCalledTimes(1);
	});

	test.each([
		['node', { ...source, previousNode: 'B' }, { item: 0 }],
		['run', { ...source, previousNodeRun: 0 }, { item: 0 }],
		['output', { ...source, previousNodeOutput: 0 }, { item: 0 }],
		['item', source, { item: 1 }],
	])('keys a different %s as a distinct state', (_, otherSource, otherItem) => {
		const memo = new PairedItemMemo();
		const compute = vi.fn(() => item);

		memo.resolve(source, { item: 0 }, compute);
		memo.resolve(otherSource, otherItem, compute);
		expect(compute).toHaveBeenCalledTimes(2);
	});
});
