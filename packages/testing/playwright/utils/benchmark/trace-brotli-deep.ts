#!/usr/bin/env npx tsx
/**
 * Deep trace BrotliEncoder JS objects — find what response/connection retains them.
 * Usage: npx tsx utils/benchmark/trace-brotli-deep.ts <snapshot.heapsnapshot>
 */
import { getFullHeapFromFile } from '@memlab/heap-analysis';

async function main() {
	const file = process.argv[2];
	if (!file) {
		console.error('Usage: trace-brotli-deep.ts <snapshot.heapsnapshot>');
		process.exit(1);
	}

	console.log(`Loading ${file}...`);
	const heap = await getFullHeapFromFile(file);

	// Find BrotliEncoder JS objects (not native nodes, not strings)
	const encoders: Array<{ id: number; name: string; retainedSize: number }> = [];
	heap.nodes.forEach((node) => {
		if (node.name === 'BrotliEncoder' && node.type === 'object' && node.retainedSize > 1024) {
			encoders.push({ id: node.id, name: node.name, retainedSize: node.retainedSize });
		}
	});

	console.log(`\nFound ${encoders.length} BrotliEncoder objects\n`);

	for (const enc of encoders) {
		const node = heap.getNodeById(enc.id);
		if (!node) continue;

		console.log(
			`\n=== BrotliEncoder @${enc.id} (${(enc.retainedSize / 1024 / 1024).toFixed(1)} MB) ===`,
		);

		// Show what this BrotliEncoder references (outgoing edges)
		console.log('  Outgoing references:');
		node.references.forEach((edge) => {
			const to = edge.toNode;
			const eName =
				typeof edge.name_or_index === 'string' ? edge.name_or_index : `[${edge.name_or_index}]`;
			if (to.retainedSize > 1024 || to.name.includes('Brotli') || to.name.includes('zlib')) {
				console.log(
					`    .${eName} -> ${to.name} (${to.type}, ${(to.retainedSize / 1024 / 1024).toFixed(2)} MB) @${to.id}`,
				);
			}
		});

		// Walk referrer chain deep (12 levels), showing all referrers at each level
		console.log('  Referrer chain:');
		let current = node;
		for (let depth = 0; depth < 12 && current; depth++) {
			const indent = '    ' + '  '.repeat(depth);
			const referrers: Array<{
				name: string;
				type: string;
				edgeName: string;
				id: number;
				retainedSize: number;
				node: typeof current;
			}> = [];

			current.referrers.forEach((edge) => {
				const from = edge.fromNode;
				if (from.type === 'synthetic' || from.name === '(GC roots)') return;
				referrers.push({
					name: from.name,
					type: from.type,
					edgeName:
						typeof edge.name_or_index === 'string' ? edge.name_or_index : `[${edge.name_or_index}]`,
					id: from.id,
					retainedSize: from.retainedSize,
					node: from as typeof current,
				});
			});

			if (referrers.length === 0) {
				console.log(`${indent}<- (root)`);
				break;
			}

			// Show ALL referrers at this level
			for (const ref of referrers) {
				const sizeMB = (ref.retainedSize / 1024 / 1024).toFixed(2);
				const marker = ref === referrers[0] ? '' : ' (alt)';
				console.log(
					`${indent}<- ${ref.name} (${ref.type}) via .${ref.edgeName} @${ref.id} [${sizeMB} MB]${marker}`,
				);
			}

			// Follow the first non-native referrer for depth traversal
			const best = referrers.find((r) => !r.type.startsWith('native')) ?? referrers[0];
			current = best.node;
		}
	}
}

main().catch(console.error);
