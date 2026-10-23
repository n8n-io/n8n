/**
 * Memory guard estimator benchmarks. With the guard enabled, the estimator runs after
 * every node run, so its cost must stay far below the cost of running a node. The cases
 * cover each sampling and walk limit, and the shapes that real workflows produce.
 *
 * Run: pnpm --filter=@n8n/performance bench
 */
import {
	estimateItemsSize,
	estimateTaskDataSize,
} from 'n8n/src/memory-guard/estimate-run-data-size';
import type { IRunData, ITaskData } from 'n8n-workflow';
import { describe } from 'vitest';

import { defineBench } from '../bench-options';
import {
	bigStringItems,
	binaryItems,
	deepItems,
	fanOutItem,
	flatItems,
	warmSeenSet,
	wideItems,
} from './fixtures/items';

// An execution keeps one WeakSet for its whole life, and every node adds to it.
// Each cold benchmark starts from an empty set, as the first node of an execution does.

describe('Memory guard estimator: realistic outputs', () => {
	const empty: never[] = [];
	defineBench('empty output (floor: call plus WeakSet allocation)', () => {
		estimateItemsSize(empty, new WeakSet());
	});

	const flat100 = flatItems(100);
	defineBench('100 flat items, 12 fields each (typical node output)', () => {
		estimateItemsSize(flat100, new WeakSet());
	});

	const flat10k = flatItems(10_000);
	defineBench('10,000 flat items, 12 fields each (sampling must keep this flat)', () => {
		estimateItemsSize(flat10k, new WeakSet());
	});

	const binary100 = binaryItems(100, 50_000);
	defineBench('100 items with a 50 KB base64 buffer each', () => {
		estimateItemsSize(binary100, new WeakSet());
	});

	const passThrough = flatItems(100);
	const warmSeen = warmSeenSet(passThrough);
	defineBench('100 flat items already counted (pass-through node)', () => {
		estimateItemsSize(passThrough, warmSeen);
	});

	// A Sort or Filter node: new wrappers paired to the input, same `json` objects.
	const sourceItems = flatItems(10_000);
	const runData: IRunData = { Source: [{ data: { main: [sourceItems] } } as unknown as ITaskData] };
	const sorted = sourceItems
		.map((item, index) => ({ ...item, pairedItem: { item: index } }))
		.reverse();
	const sortTask = {
		source: [{ previousNode: 'Source' }],
		data: { main: [sorted] },
	} as unknown as ITaskData;
	defineBench('10,000 items reordered from the input (paired pass-through)', () => {
		estimateTaskDataSize(sortTask, runData, new WeakSet());
	});
});

describe('Memory guard estimator: cost drivers', () => {
	const wide = wideItems(100, 200);
	defineBench('100 items, 200 fields each (sampled past 100 keys)', () => {
		estimateItemsSize(wide, new WeakSet());
	});

	const bigStrings = bigStringItems(100, 50_000);
	defineBench('100 items, one 50 KB string each (string length is read, not walked)', () => {
		estimateItemsSize(bigStrings, new WeakSet());
	});

	const deep = deepItems(100, 40);
	defineBench('100 items nested 40 levels (inside the depth limit)', () => {
		estimateItemsSize(deep, new WeakSet());
	});
});

describe('Memory guard estimator: pathological shapes', () => {
	const tooDeep = deepItems(100, 500);
	defineBench('100 items nested 500 levels (depth limit must cap this)', () => {
		estimateItemsSize(tooDeep, new WeakSet());
	});

	const fanOut = fanOutItem(5_000);
	defineBench('1 item with 5,000 keys of small objects (key sampling must cap this)', () => {
		estimateItemsSize(fanOut, new WeakSet());
	});

	const bigList = [{ json: { list: flatItems(100_000).map((item) => item.json) } }];
	defineBench('1 item holding an array of 100,000 records (array sampling must cap this)', () => {
		estimateItemsSize(bigList, new WeakSet());
	});
});

describe('Memory guard estimator: whole execution', () => {
	// 20 nodes, 100 items each, one shared WeakSet, as the tracker holds it.
	const outputs = Array.from({ length: 20 }, () => flatItems(100));
	defineBench('20 nodes x 100 flat items, one shared WeakSet', () => {
		const seen = new WeakSet<object>();
		for (const items of outputs) estimateItemsSize(items, seen);
	});
});
