#!/usr/bin/env npx tsx
/**
 * Trace BrotliCompressionStream retainer chains in a heap snapshot.
 * Usage: npx tsx utils/benchmark/trace-brotli.ts <snapshot.heapsnapshot>
 */

import { getFullHeapFromFile } from '@memlab/heap-analysis';

async function main() {
	const file = process.argv[2];
	if (!file) {
		console.error('Usage: trace-brotli.ts <snapshot.heapsnapshot>');
		process.exit(1);
	}

	console.log(`Loading ${file}...`);
	const heap = await getFullHeapFromFile(file);

	const brotliNodes: Array<{ id: number; retainedSize: number }> = [];
	heap.nodes.forEach((node) => {
		if (node.name === 'Node / BrotliCompressionStream' || node.name === 'Node / zlib_memory') {
			brotliNodes.push({ id: node.id, retainedSize: node.retainedSize });
		}
	});

	console.log(`\nFound ${brotliNodes.length} Brotli/zlib native nodes\n`);

	// Dedupe by ID (zlib_memory and BrotliCompressionStream may be separate nodes for same stream)
	const seen = new Set<number>();

	for (const bn of brotliNodes) {
		if (seen.has(bn.id)) continue;
		seen.add(bn.id);

		const node = heap.getNodeById(bn.id);
		if (!node) continue;

		console.log(`@${bn.id} ${node.name} (${(bn.retainedSize / 1024 / 1024).toFixed(1)} MB):`);

		// Walk referrer chain up to 6 levels
		let current = node;
		for (let depth = 0; depth < 6 && current; depth++) {
			const indent = '  '.repeat(depth + 1);
			let bestReferrer: {
				name: string;
				type: string;
				edgeName: string;
				id: number;
				node: typeof current;
			} | null = null;

			current.referrers.forEach((edge) => {
				const from = edge.fromNode;
				// Skip synthetic/system nodes for cleaner traces
				if (from.type === 'synthetic' || from.name === '(GC roots)') return;
				// Prefer non-system referrers
				if (
					!bestReferrer ||
					(bestReferrer.type.startsWith('system') && !from.type.startsWith('system'))
				) {
					bestReferrer = {
						name: from.name,
						type: from.type,
						edgeName:
							typeof edge.name_or_index === 'string'
								? edge.name_or_index
								: `[${edge.name_or_index}]`,
						id: from.id,
						node: from as typeof current,
					};
				}
			});

			if (bestReferrer) {
				console.log(
					`${indent}<- ${bestReferrer.name} (${bestReferrer.type}) via .${bestReferrer.edgeName} @${bestReferrer.id}`,
				);
				current = bestReferrer.node;
			} else {
				console.log(`${indent}<- (no non-synthetic referrers)`);
				break;
			}
		}
		console.log();
	}
}

main().catch(console.error);
