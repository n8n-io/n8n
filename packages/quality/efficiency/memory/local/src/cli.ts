import { formatBytes } from '@n8n/utils/number/bytes';
import { truncate } from '@n8n/utils/string/truncate';
import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';

import { createReport } from './report.js';
import { captureSession } from './session.js';

const help = `Local process memory capture

  pnpm memory:start                    Start n8n with the memory endpoints
  pnpm memory run --url http://localhost:5678
  pnpm memory run --url http://localhost:5678 -- <foreground workload command>
  pnpm memory report [run-directory]   Defaults to the latest run

Run options:
  --url         Instance URL. Required. Uses test-only process diagnostics.
  --output      Parent artifact directory. Default: .memory-runs
  --interval    Sampling interval in seconds. Default: 2
  --timeout     Diagnostic request timeout in seconds. Default: 10
  --gc          Request GC at named checkpoints. Requires node --expose-gc.
  --snapshots   Separate snapshot capture. Disables continuous sampling.

The tool attaches only. It never starts, resets, or stops n8n.
Workloads inherit N8N_BASE_URL, PLAYWRIGHT_SKIP_WEBSERVER=true, RESET_E2E_DB=false.
Type checkpoint names during manual capture. Type quit to save baseline/final evidence.
Ctrl+C saves an interrupted run and cancels the tool's foreground workload.
`;

function seconds(value: string, name: string): number {
	const duration = Number(value);
	if (!Number.isFinite(duration) || duration < 0.05 || duration > 600)
		throw new Error(`${name} must be between 0.05 and 600 seconds.`);
	return Math.round(duration * 1000);
}

async function* noInput(): AsyncGenerator<string> {}

async function latestRun(parent: string): Promise<string> {
	const entries = await readdir(parent, { withFileTypes: true }).catch(() => []);
	const runs = await Promise.all(
		entries
			.filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
			.map(async (entry) => {
				const directory = join(parent, entry.name);
				return { directory, time: (await stat(directory)).mtimeMs };
			}),
	);
	const latest = runs.sort((a, b) => b.time - a.time)[0];
	if (!latest)
		throw new Error(
			`No runs found in ${parent}. Record one with: pnpm memory run --url <instance>`,
		);
	return latest.directory;
}

async function main() {
	const args = process.argv.slice(2);
	const separator = args.indexOf('--');
	const command = separator < 0 ? [] : args.slice(separator + 1);
	const { values, positionals } = parseArgs({
		args: separator < 0 ? args : args.slice(0, separator),
		allowPositionals: true,
		options: {
			url: { type: 'string' },
			output: { type: 'string', default: '.memory-runs' },
			interval: { type: 'string', default: '2' },
			timeout: { type: 'string', default: '10' },
			gc: { type: 'boolean', default: false },
			snapshots: { type: 'boolean', default: false },
			help: { type: 'boolean', short: 'h' },
		},
	});
	if (values.help || !positionals.length) {
		console.log(help);
		return;
	}
	const cwd = process.env.INIT_CWD ?? process.cwd();
	if (positionals[0] === 'report' && positionals.length <= 2 && !command.length) {
		const directory = positionals[1]
			? resolve(cwd, positionals[1])
			: await latestRun(resolve(cwd, values.output));
		const report = await createReport(directory);
		console.log(`Run: ${directory}`);
		console.log(`Capture: ${report.status}${report.error ? ` — ${report.error}` : ''}`);
		console.table(
			report.checkpoints.map((entry) => ({
				checkpoint: entry.label,
				gc: entry.gc,
				heapMiB: +(entry.memory.heapUsed / 1024 / 1024).toFixed(2),
				rssMiB: +(entry.memory.rss / 1024 / 1024).toFixed(2),
				externalMiB: +(entry.memory.external / 1024 / 1024).toFixed(2),
			})),
		);
		if (report.topGrowth?.length) {
			console.log('\nFastest-growing object types (first → last snapshot):');
			console.table(
				report.topGrowth.map((entry) => ({
					object: truncate(entry.name, 60),
					added: entry.countDelta,
					size: formatBytes(entry.sizeDeltaBytes),
				})),
			);
		}
		for (const note of report.notes) console.log(note);
		console.log(
			`Report: ${directory}/report.json${report.mode === 'measurements' ? `\nChart: ${directory}/memory.svg` : ''}`,
		);
		process.exitCode = report.status === 'completed' ? 0 : 1;
		return;
	}
	if (positionals[0] !== 'run' || positionals.length !== 1) {
		throw new Error('Use "pnpm memory run --url <instance>" or "pnpm memory report". See --help.');
	}
	if (!values.url) {
		throw new Error(
			'Add the n8n instance URL, for example: pnpm memory run --url http://localhost:5678',
		);
	}
	if (separator >= 0 && !command.length) {
		throw new Error('Add a workload command after --, or remove the --.');
	}
	const controller = new AbortController();
	const interrupt = () => controller.abort(new Error('Capture interrupted.'));
	process.once('SIGINT', interrupt);
	process.once('SIGTERM', interrupt);
	const input = command.length
		? undefined
		: createInterface({ input: process.stdin, output: process.stdout });
	input?.once('SIGINT', interrupt);
	// Iterate now so readline buffers lines typed before the baseline checkpoint finishes.
	const lines = input?.[Symbol.asyncIterator]();
	try {
		const result = await captureSession(
			{
				url: values.url,
				output: values.output,
				cwd,
				intervalMs: seconds(values.interval, '--interval'),
				timeoutMs: seconds(values.timeout, '--timeout'),
				gc: values.gc,
				snapshots: values.snapshots,
			},
			command,
			lines ? { [Symbol.asyncIterator]: () => lines } : noInput(),
			controller.signal,
		);
		process.exitCode =
			result.manifest.status === 'completed'
				? 0
				: result.manifest.status === 'interrupted'
					? 130
					: 1;
	} finally {
		input?.close();
		process.removeListener('SIGINT', interrupt);
		process.removeListener('SIGTERM', interrupt);
	}
}

try {
	await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : 'Memory capture failed.');
	process.exitCode = 1;
}
