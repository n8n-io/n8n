#!/usr/bin/env tsx
/**
 * Compares two saved memory snapshots from `pnpm memory:snapshot`.
 * Prints the change in process memory and the object types whose retained size grew the most.
 *
 * Each argument is a saved file or the path without extension, for example `memory-snapshots/before`.
 * The heap diff runs only when both heap snapshots exist.
 *
 * Usage:
 *   pnpm memory:compare <before> <after> [--top <n>]
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { computeHeapDiff } from '../utils/benchmark/run-heap-analysis';
import type { RssBreakdown } from '../utils/performance-helper';

type Breakdown = Pick<RssBreakdown, 'processMemoryUsage' | 'rollup'>;

const formatDelta = (before: number, after: number) => {
	const delta = after - before;
	return `${before} MB -> ${after} MB (${delta >= 0 ? '+' : ''}${delta} MB)`;
};

const toBasePath = (path: string) => path.replace(/\.(heapsnapshot|memory\.json)$/, '');

async function readBreakdown(basePath: string): Promise<Breakdown | null> {
	const breakdownPath = `${basePath}.memory.json`;
	if (!existsSync(breakdownPath)) return null;
	return JSON.parse(await readFile(breakdownPath, 'utf-8')) as Breakdown;
}

async function main() {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: { top: { type: 'string', default: '25' } },
	});

	if (positionals.length !== 2) {
		console.error('Usage: memory:compare <before> <after> [--top <n>]');
		process.exit(1);
	}

	const cwd = process.env.INIT_CWD ?? process.cwd();
	const [beforeBase, afterBase] = positionals.map((path) => toBasePath(resolve(cwd, path)));

	const [before, after] = await Promise.all([readBreakdown(beforeBase), readBreakdown(afterBase)]);
	if (before && after) {
		console.log('\nProcess memory');
		for (const key of ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers'] as const) {
			const label = key.padEnd(14);
			console.log(
				`  ${label}${formatDelta(before.processMemoryUsage[key], after.processMemoryUsage[key])}`,
			);
		}
		if (before.rollup?.PssMB !== undefined && after.rollup?.PssMB !== undefined) {
			console.log(`  ${'pss'.padEnd(14)}${formatDelta(before.rollup.PssMB, after.rollup.PssMB)}`);
		}
	}

	const [beforeSnapshot, afterSnapshot] = [beforeBase, afterBase].map(
		(base) => `${base}.heapsnapshot`,
	);
	if (!existsSync(beforeSnapshot) || !existsSync(afterSnapshot)) {
		console.log('\nSkipped the heap diff, because one or both heap snapshots do not exist.');
		return;
	}

	const diff = await computeHeapDiff(beforeSnapshot, afterSnapshot);
	const top = Number(values.top);
	console.log(`\nTop ${top} object types by growth in retained size`);
	for (const entry of diff.slice(0, top)) {
		const sizeMB = (entry.sizeDeltaBytes / 1024 / 1024).toFixed(2);
		const count = `${entry.countDelta >= 0 ? '+' : ''}${entry.countDelta}`;
		console.log(`  +${sizeMB} MB  ${count} x ${entry.name} (${entry.type})`);
	}
	console.log(
		'\nOpen both files in Chrome DevTools (Memory tab, Comparison view) to see what retains these objects.',
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
