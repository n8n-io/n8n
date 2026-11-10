import { chaosRun, chaosSchedule } from '../chaos/run';
import { describeFault } from '../chaos/schedule';
import { shrink } from '../chaos/shrink';
import { parseChaosArgs, USAGE } from './chaos-args';
import { stopAllStacks } from '../stack';

async function main(): Promise<number> {
	const args = parseChaosArgs(process.argv.slice(2));
	if (args.help) {
		console.log(USAGE);
		return 0;
	}
	if (!process.env.TEST_IMAGE_N8N) throw new Error(`set TEST_IMAGE_N8N\n${USAGE}`);

	const options = { ...args };
	const schedule = chaosSchedule(options);
	console.log(`seed ${args.seed}: ${schedule.length} faults over ${args.durationMs / 1000} s`);
	for (const { atMs, fault } of schedule) console.log(`  +${atMs} ms ${describeFault(fault)}`);

	const result = await chaosRun(options, schedule);
	console.log(
		`\n${result.requests} requests, ${result.accepted} accepted, ${result.executions} executions, ${result.violations.length} violations`,
	);
	for (const v of result.violations) console.log(`  ${v.invariant}: ${JSON.stringify(v.detail)}`);
	const failedFaults = result.applied.filter((f) => f.error);
	for (const a of failedFaults)
		console.log(`  fault failed: ${describeFault(a.fault)}: ${a.error}`);

	if (result.violations.length && args.shrink) {
		console.log(
			`\nshrinking: ${args.repeats} runs per candidate, ${args.minFailures} failures to keep it`,
		);
		const violated = new Set(result.violations.map((v) => v.invariant));
		const shrunk = await shrink(
			schedule,
			async (candidate) =>
				(await chaosRun({ ...options, outDir: undefined }, candidate)).violations.some((v) =>
					violated.has(v.invariant),
				),
			{
				repeats: args.repeats,
				minFailures: args.minFailures,
				maxRuns: 100,
				budgetMs: args.budgetMs,
			},
		);
		console.log(
			`smallest failing schedule after ${shrunk.runs} runs${shrunk.exhausted ? ' (budget ran out)' : ''}:`,
		);
		for (const { atMs, fault } of shrunk.schedule)
			console.log(`  +${atMs} ms ${describeFault(fault)}`);
	}
	console.log(`\nlogs and records in ${args.outDir}; replay with --seed ${args.seed}`);
	return result.violations.length || failedFaults.length ? 1 : 0;
}

if (require.main === module) {
	let interrupted = false;
	process.on('SIGINT', () => {
		if (interrupted) process.exit(130);
		interrupted = true;
		console.error('interrupted; stopping stacks');
		void stopAllStacks()
			.catch((error: unknown) => console.error(error instanceof Error ? error.message : error))
			.finally(() => process.exit(130));
	});
	void main()
		.catch((error: unknown) => {
			console.error(error instanceof Error ? error.message : error);
			return 2;
		})
		.then((code) => {
			if (!interrupted) process.exit(code);
		});
}
