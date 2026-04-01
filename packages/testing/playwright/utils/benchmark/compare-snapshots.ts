#!/usr/bin/env npx tsx
import { getFullHeapFromFile } from '@memlab/heap-analysis';

async function analyze(label: string, file: string) {
	const heap = await getFullHeapFromFile(file);

	const categories = new Map<string, { count: number; size: number }>();

	heap.nodes.forEach((node) => {
		const cat = node.type === 'native' ? `native: ${node.name}` : node.type;
		const e = categories.get(cat) ?? { count: 0, size: 0 };
		e.count++;
		e.size += node.retainedSize;
		categories.set(cat, e);
	});

	return { label, categories };
}

async function main() {
	const [baselineFile, finalFile] = process.argv.slice(2);
	if (!baselineFile || !finalFile) {
		console.error('Usage: compare-snapshots.ts <baseline.heapsnapshot> <final.heapsnapshot>');
		process.exit(1);
	}

	const baseline = await analyze('BASELINE', baselineFile);
	const final = await analyze('FINAL', finalFile);

	// Compute deltas
	const allCats = new Set([...baseline.categories.keys(), ...final.categories.keys()]);
	const diffs: Array<{
		cat: string;
		bCount: number;
		fCount: number;
		bSize: number;
		fSize: number;
		delta: number;
	}> = [];

	for (const cat of allCats) {
		const b = baseline.categories.get(cat) ?? { count: 0, size: 0 };
		const f = final.categories.get(cat) ?? { count: 0, size: 0 };
		diffs.push({
			cat,
			bCount: b.count,
			fCount: f.count,
			bSize: b.size,
			fSize: f.size,
			delta: f.size - b.size,
		});
	}

	diffs.sort((a, b) => b.delta - a.delta);

	console.log('\nTop growing categories (baseline → final):');
	console.log('─'.repeat(90));
	for (const d of diffs.slice(0, 25)) {
		if (d.delta <= 0) continue;
		const bMB = (d.bSize / 1024 / 1024).toFixed(1);
		const fMB = (d.fSize / 1024 / 1024).toFixed(1);
		const dMB = (d.delta / 1024 / 1024).toFixed(1);
		console.log(
			`  +${dMB} MB  ${d.cat}  (${bMB} → ${fMB} MB, ${d.bCount} → ${d.fCount} instances)`,
		);
	}

	console.log('\nTop shrinking categories:');
	console.log('─'.repeat(90));
	for (const d of diffs.slice(-10).reverse()) {
		if (d.delta >= 0) continue;
		const dMB = (d.delta / 1024 / 1024).toFixed(1);
		console.log(`  ${dMB} MB  ${d.cat}`);
	}
}

main().catch(console.error);
