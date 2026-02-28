import type { OrchestrationResult } from './orchestrator.js';

export function formatOrchestrationJSON(result: OrchestrationResult): string {
	return JSON.stringify(result, null, 2);
}

export function formatOrchestrationConsole(result: OrchestrationResult, verbose: boolean): void {
	const { shards, totalTestTime } = result;
	const targetPerShard = totalTestTime / shards.length;

	console.error(`\nOrchestration: ${shards.length} shards`);
	console.error(`  Total test time: ${(totalTestTime / 60_000).toFixed(1)} min`);
	console.error(`  Target per shard: ${(targetPerShard / 60_000).toFixed(1)} min`);

	const allCapabilities = new Set(shards.flatMap((s) => s.capabilities));
	if (allCapabilities.size > 0) {
		console.error(`  Capabilities: ${[...allCapabilities].sort().join(', ')}`);
	}

	const totalSpecs = shards.reduce((sum, s) => sum + s.specs.length, 0);
	console.error(`  Specs: ${totalSpecs}`);

	let maxTestTime = 0;
	console.error('');
	for (const shard of shards) {
		maxTestTime = Math.max(maxTestTime, shard.testTime);
		const mins = (shard.testTime / 60_000).toFixed(1);
		const caps = shard.capabilities.length > 0 ? ` [${shard.capabilities.join(', ')}]` : '';
		const fixtures = `${shard.fixtureCount} fixture${shard.fixtureCount !== 1 ? 's' : ''}`;
		console.error(
			`  Shard ${shard.shard}: ${shard.specs.length} specs, ${mins} min, ${fixtures}${caps}`,
		);
	}

	console.error(
		`\n  Expected wall-clock: ~${(maxTestTime / 60_000).toFixed(1)} min (longest shard)`,
	);

	if (verbose) {
		console.error('\nPer-shard specs:');
		for (const shard of shards) {
			console.error(`  Shard ${shard.shard}:`);
			for (const spec of shard.specs) {
				console.error(`    ${spec}`);
			}
		}
	}

	console.error('');
}
