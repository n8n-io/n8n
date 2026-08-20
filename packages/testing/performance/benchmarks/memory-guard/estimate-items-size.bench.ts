/**
 * Memory guard estimator benchmarks.
 *
 * `estimateItemsSize` runs in `ExecutionMemoryTracker.onNodeFinish`, once per
 * output branch per run of every node, on every execution. It therefore sits on
 * the hottest path the memory guard touches, and its cost must stay far below
 * the cost of executing a node.
 *
 * The estimator walks values instead of serializing them. Three bounds keep the
 * walk cheap: it measures at most SAMPLE_SIZE (10) items per output, visits at
 * most WALK_BUDGET (10,000) values, and descends at most MAX_DEPTH (64) levels.
 * The benchmarks below exercise each bound, plus the shapes a real workflow
 * produces.
 *
 * The estimator lives in `packages/cli`, which this package does not depend on.
 * It imports one type and nothing else, so a relative import is enough and adds
 * no dependency edge.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import { bench, describe } from 'vitest';

import { estimateItemsSize } from '../../../../cli/src/memory-guard/estimate-items-size';
import { BENCH_OPTIONS } from '../bench-options';
import {
	bigStringItems,
	binaryItems,
	deepItems,
	fanOutItem,
	flatItems,
	warmSeenSet,
	wideItems,
} from './fixtures/items';

// A production execution keeps one WeakSet for its whole life, and every node
// adds to it. Each cold benchmark therefore starts from an empty set, which is
// what the first node of an execution sees.

describe('Memory guard estimator: realistic outputs', () => {
	const empty: never[] = [];
	bench(
		'empty output (floor: call plus WeakSet allocation)',
		() => {
			estimateItemsSize(empty, new WeakSet());
		},
		BENCH_OPTIONS,
	);

	const flat100 = flatItems(100);
	bench(
		'100 flat items, 12 fields each (typical node output)',
		() => {
			estimateItemsSize(flat100, new WeakSet());
		},
		BENCH_OPTIONS,
	);

	const flat10k = flatItems(10_000);
	bench(
		'10,000 flat items, 12 fields each (sampling must keep this flat)',
		() => {
			estimateItemsSize(flat10k, new WeakSet());
		},
		BENCH_OPTIONS,
	);

	const binary100 = binaryItems(100, 50_000);
	bench(
		'100 items with a 50 KB base64 buffer each',
		() => {
			estimateItemsSize(binary100, new WeakSet());
		},
		BENCH_OPTIONS,
	);

	const passThrough = flatItems(100);
	const warmSeen = warmSeenSet(passThrough);
	bench(
		'100 flat items already counted (pass-through node)',
		() => {
			estimateItemsSize(passThrough, warmSeen);
		},
		BENCH_OPTIONS,
	);
});

describe('Memory guard estimator: cost drivers', () => {
	const wide = wideItems(100, 200);
	bench(
		'100 items, 200 fields each (field count drives cost)',
		() => {
			estimateItemsSize(wide, new WeakSet());
		},
		BENCH_OPTIONS,
	);

	const bigStrings = bigStringItems(100, 50_000);
	bench(
		'100 items, one 50 KB string each (string length is read, not walked)',
		() => {
			estimateItemsSize(bigStrings, new WeakSet());
		},
		BENCH_OPTIONS,
	);

	const deep = deepItems(100, 40);
	bench(
		'100 items nested 40 levels (inside MAX_DEPTH)',
		() => {
			estimateItemsSize(deep, new WeakSet());
		},
		BENCH_OPTIONS,
	);
});

describe('Memory guard estimator: pathological shapes', () => {
	const tooDeep = deepItems(100, 500);
	bench(
		'100 items nested 500 levels (MAX_DEPTH must cap this)',
		() => {
			estimateItemsSize(tooDeep, new WeakSet());
		},
		BENCH_OPTIONS,
	);

	const fanOut = fanOutItem(5_000);
	bench(
		'1 item holding ~25,000 values (WALK_BUDGET must cap this)',
		() => {
			estimateItemsSize(fanOut, new WeakSet());
		},
		BENCH_OPTIONS,
	);
});

describe('Memory guard estimator: whole execution', () => {
	// 20 nodes, 100 items each, one shared WeakSet, as the tracker holds it.
	const outputs = Array.from({ length: 20 }, () => flatItems(100));
	bench(
		'20 nodes x 100 flat items, one shared WeakSet',
		() => {
			const seen = new WeakSet<object>();
			for (const items of outputs) estimateItemsSize(items, seen);
		},
		BENCH_OPTIONS,
	);
});
