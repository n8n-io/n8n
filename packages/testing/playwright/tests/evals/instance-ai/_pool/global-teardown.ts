import path from 'node:path';

import { stopPoolServer } from './pool-server';

export default async function globalTeardown(): Promise<void> {
	const outFile = path.join(process.cwd(), 'eval-pool-report.json');
	const r = await stopPoolServer(outFile);

	const line = '─'.repeat(64);
	console.log(`\n${line}\n[eval-pool] VERDICT: ${r.verdict}`);
	console.log(
		`  builds: ${r.totalBuilds} (ok=${r.okBuilds}, incomplete=${r.incompleteIntervals}) across ${r.laneCount} lanes`,
	);
	console.log(
		`  observed max concurrent builds: global=${r.observedMaxConcurrencyGlobal}, cap/lane=${r.cap}`,
	);
	console.log(`  per-lane max concurrency: ${JSON.stringify(r.observedMaxConcurrencyPerLane)}`);
	console.log(`  builds per lane: ${JSON.stringify(r.buildsPerLane)}`);
	console.log(
		`  affinity violations (scenario ran off its build instance): ${r.affinityViolations.length}`,
	);
	console.log(
		`  collision violations (same case twice at once on one instance): ${r.collisionViolations.length}`,
	);
	console.log(`  cap violations (>${r.cap} concurrent on one instance): ${r.capViolations.length}`);
	if (r.affinityViolations.length) console.log(`  ${JSON.stringify(r.affinityViolations)}`);
	if (r.collisionViolations.length) console.log(`  ${JSON.stringify(r.collisionViolations)}`);
	if (r.capViolations.length) console.log(`  ${JSON.stringify(r.capViolations)}`);
	console.log(`  full interval log → ${outFile}\n${line}\n`);
}
