#!/usr/bin/env tsx
/**
 * Saves a memory breakdown and a heap snapshot of a running n8n instance.
 * The instance must run with E2E_TESTS=true, for example from `pnpm memory:stack`.
 *
 * Usage:
 *   pnpm memory:snapshot --label <label> [--url <n8n url>] [--dir <output dir>] [--skip-heap]
 */
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { parseArgs } from 'node:util';

import type { RssBreakdown } from '../utils/performance-helper';

const USAGE =
	'Usage: memory:snapshot --label <label> [--url <n8n url>] [--dir <output dir>] [--skip-heap]';

async function main() {
	const { values } = parseArgs({
		options: {
			url: { type: 'string', default: 'http://localhost:5678' },
			label: { type: 'string' },
			dir: { type: 'string', default: 'memory-snapshots' },
			'skip-heap': { type: 'boolean', default: false },
		},
	});

	if (!values.label) {
		console.error(USAGE);
		process.exit(1);
	}

	// pnpm runs scripts in the package dir, so resolve relative paths from where the user ran pnpm.
	const outputDir = resolve(process.env.INIT_CWD ?? process.cwd(), values.dir);
	await mkdir(outputDir, { recursive: true });
	const baseUrl = values.url.replace(/\/$/, '');

	// Read the breakdown after GC and before the snapshot, because writing a snapshot inflates RSS.
	await fetch(`${baseUrl}/rest/e2e/gc`, { method: 'POST' });
	const mapsRes = await fetch(`${baseUrl}/rest/e2e/memory-maps`);
	if (!mapsRes.ok) {
		throw new Error(
			`GET /rest/e2e/memory-maps returned ${mapsRes.status}. Start n8n with E2E_TESTS=true.`,
		);
	}
	const { data } = (await mapsRes.json()) as { data: RssBreakdown & { raw?: string | null } };
	const { raw: _raw, ...breakdown } = data;
	const breakdownPath = join(outputDir, `${values.label}.memory.json`);
	await writeFile(breakdownPath, JSON.stringify(breakdown, null, 2));

	const usage = breakdown.processMemoryUsage;
	console.log(
		`RSS ${usage.rss} MB, heap used ${usage.heapUsed} MB of ${usage.heapTotal} MB, external ${usage.external} MB`,
	);
	if (breakdown.rollup?.PssMB !== undefined) {
		console.log(`PSS ${breakdown.rollup.PssMB} MB`);
	}
	console.log(`Saved ${breakdownPath}`);

	if (values['skip-heap']) return;

	console.log('Writing heap snapshot...');
	const createRes = await fetch(`${baseUrl}/rest/e2e/heap-snapshot`, { method: 'POST' });
	const created = (await createRes.json()) as { data: { success: boolean; filePath?: string } };
	if (!created.data.success || !created.data.filePath) {
		throw new Error(`Heap snapshot failed: ${JSON.stringify(created)}`);
	}

	const downloadRes = await fetch(`${baseUrl}/rest/e2e/heap-snapshot/${created.data.filePath}`);
	if (!downloadRes.ok || !downloadRes.body) {
		throw new Error(`Heap snapshot download returned ${downloadRes.status}`);
	}
	const snapshotPath = join(outputDir, `${values.label}.heapsnapshot`);
	await pipeline(
		Readable.fromWeb(downloadRes.body as unknown as NodeReadableStream),
		createWriteStream(snapshotPath),
	);
	console.log(`Saved ${snapshotPath}`);
	console.log(
		'Note: V8 uses native memory to write a heap snapshot, and the process can keep that memory. ' +
			'RSS values that you save later in this process can include it. ' +
			'Use --skip-heap for steps where you only need RSS.',
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
