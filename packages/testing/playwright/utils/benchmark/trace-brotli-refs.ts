import { getFullHeapFromFile } from '@memlab/heap-analysis';

async function main() {
	const file = process.argv[2];
	const heap = await getFullHeapFromFile(file);

	// Collect native Brotli node IDs
	const brotliIds = new Set<number>();
	heap.nodes.forEach((node) => {
		if (node.name === 'Node / BrotliCompressionStream') {
			brotliIds.add(node.id);
		}
	});
	console.log(
		`Found ${brotliIds.size} native BrotliCompressionStream nodes: ${[...brotliIds].join(', ')}\n`,
	);

	// For each Brotli node, find ALL referrers (including via javascript_to_native)
	for (const bId of brotliIds) {
		const bNode = heap.getNodeById(bId);
		if (!bNode) continue;
		console.log(`\n=== @${bId} BrotliCompressionStream ===`);
		console.log(`  Referrers:`);
		bNode.referrers.forEach((edge) => {
			const from = edge.fromNode;
			const eName =
				typeof edge.name_or_index === 'string' ? edge.name_or_index : `[${edge.name_or_index}]`;
			console.log(
				`    <- @${from.id} ${from.name} (${from.type}) via .${eName} [retained: ${(from.retainedSize / 1024).toFixed(0)} KB]`,
			);

			// If this is a JS object, trace its referrers too (2 more levels)
			if (from.type === 'object' || from.type === 'closure') {
				from.referrers.forEach((edge2) => {
					const from2 = edge2.fromNode;
					if (from2.type === 'synthetic') return;
					const eName2 =
						typeof edge2.name_or_index === 'string'
							? edge2.name_or_index
							: `[${edge2.name_or_index}]`;
					console.log(`      <- @${from2.id} ${from2.name} (${from2.type}) via .${eName2}`);

					from2.referrers.forEach((edge3) => {
						const from3 = edge3.fromNode;
						if (from3.type === 'synthetic') return;
						const eName3 =
							typeof edge3.name_or_index === 'string'
								? edge3.name_or_index
								: `[${edge3.name_or_index}]`;
						console.log(`        <- @${from3.id} ${from3.name} (${from3.type}) via .${eName3}`);

						from3.referrers.forEach((edge4) => {
							const from4 = edge4.fromNode;
							if (from4.type === 'synthetic') return;
							const eName4 =
								typeof edge4.name_or_index === 'string'
									? edge4.name_or_index
									: `[${edge4.name_or_index}]`;
							console.log(`          <- @${from4.id} ${from4.name} (${from4.type}) via .${eName4}`);
						});
					});
				});
			}
		});
	}
}
main().catch(console.error);
