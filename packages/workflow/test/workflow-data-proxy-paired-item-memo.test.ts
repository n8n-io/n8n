import type { INodeExecutionData } from '../src/interfaces';
import { PairedItemMemo } from '../src/workflow-data-proxy-paired-item-memo';

describe('PairedItemMemo', () => {
	const source = { previousNode: 'A', previousNodeRun: 1, previousNodeOutput: 2 };
	const item: INodeExecutionData = { json: {} };
	const onCycle = () => new Error('cycle');

	test('computes once per state and replays the result', () => {
		const memo = new PairedItemMemo();
		const compute = vi.fn(() => item);

		expect(memo.resolve(source, { item: 0 }, compute, onCycle)).toBe(item);
		expect(memo.resolve(source, { item: 0 }, compute, onCycle)).toBe(item);
		expect(compute).toHaveBeenCalledTimes(1);
	});

	test('replays the same error without recomputing', () => {
		const memo = new PairedItemMemo();
		const error = new Error('boom');
		const compute = vi.fn(() => {
			throw error;
		});

		expect(() => memo.resolve(source, { item: 0 }, compute, onCycle)).toThrow(error);
		expect(() => memo.resolve(source, { item: 0 }, compute, onCycle)).toThrow(error);
		expect(compute).toHaveBeenCalledTimes(1);
	});

	test('treats omitted run and output as 0', () => {
		const memo = new PairedItemMemo();
		const compute = vi.fn(() => item);

		memo.resolve({ previousNode: 'A' }, { item: 0 }, compute, onCycle);
		memo.resolve(
			{ previousNode: 'A', previousNodeRun: 0, previousNodeOutput: 0 },
			{ item: 0 },
			compute,
			onCycle,
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

		memo.resolve(source, { item: 0 }, compute, onCycle);
		memo.resolve(otherSource, otherItem, compute, onCycle);
		expect(compute).toHaveBeenCalledTimes(2);
	});

	test('keys a node name with spaces apart from another node and run', () => {
		const memo = new PairedItemMemo();
		const compute = vi.fn(() => item);

		memo.resolve(
			{ previousNode: 'Edit Fields 1', previousNodeRun: 0 },
			{ item: 0 },
			compute,
			onCycle,
		);
		memo.resolve(
			{ previousNode: 'Edit Fields', previousNodeRun: 1 },
			{ item: 0 },
			compute,
			onCycle,
		);
		expect(compute).toHaveBeenCalledTimes(2);
	});

	test('throws the cycle error when a state is reached while it is in flight', () => {
		const memo = new PairedItemMemo();
		const cycle = new Error('cycle');

		expect(() =>
			memo.resolve(
				source,
				{ item: 0 },
				() =>
					memo.resolve(
						source,
						{ item: 0 },
						() => item,
						() => cycle,
					),
				() => cycle,
			),
		).toThrow(cycle);
	});

	test('does not memoize a result computed while a state was in flight', () => {
		const memo = new PairedItemMemo();
		const cycle = new Error('cycle');
		const inner = { previousNode: 'B' };
		// 'B' only fails because 'A' is still in flight above it, so its error
		// belongs to this branch alone and must not be replayed on another.
		const computeInner = vi.fn(() =>
			memo.resolve(
				source,
				{ item: 0 },
				() => item,
				() => cycle,
			),
		);

		expect(() =>
			memo.resolve(
				source,
				{ item: 0 },
				() => memo.resolve(inner, { item: 0 }, computeInner, () => cycle),
				() => cycle,
			),
		).toThrow(cycle);

		expect(
			memo.resolve(
				inner,
				{ item: 0 },
				() => item,
				() => cycle,
			),
		).toBe(item);
		expect(computeInner).toHaveBeenCalledTimes(1);
	});
});
