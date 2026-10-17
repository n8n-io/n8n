import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeHeapSnapshot } from 'node:v8';
import { afterEach, expect, test } from 'vitest';

import { diffSnapshots } from '../src/heap-diff.js';

class RetainedMemoryFixture {
	readonly payload = new Array(64).fill(1);
}

let directory: string | undefined;
afterEach(async () => {
	if (directory) await rm(directory, { recursive: true, force: true });
});

test('ranks the object type retained between two snapshots first', async () => {
	directory = await mkdtemp(join(tmpdir(), 'n8n-heap-diff-'));
	const baseline = writeHeapSnapshot(join(directory, 'baseline.heapsnapshot'));
	const retained = Array.from({ length: 5000 }, () => new RetainedMemoryFixture());
	const final = writeHeapSnapshot(join(directory, 'final.heapsnapshot'));

	const growth = await diffSnapshots(baseline, final, 50);

	const fixture = growth.find((entry) => entry.name === 'RetainedMemoryFixture');
	expect(fixture?.countDelta).toBe(retained.length);
	expect(growth.findIndex((entry) => entry.name === 'RetainedMemoryFixture')).toBeLessThan(5);
}, 30000);
