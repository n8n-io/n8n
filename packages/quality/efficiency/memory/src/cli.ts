import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';

import { createReport } from './report.js';
import { captureSession } from './session.js';

const help = `Local process memory capture

  pnpm memory run --url http://localhost:5689
  pnpm memory run --url http://localhost:5689 -- <foreground workload command>
  pnpm memory report <run-directory>

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
	if (positionals[0] === 'report' && positionals.length === 2 && !command.length) {
		const directory = resolve(cwd, positionals[1]);
		const report = await createReport(directory);
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
		for (const note of report.notes) console.log(note);
		console.log(
			`Report: ${directory}/report.json${report.mode === 'measurements' ? `\nChart: ${directory}/memory.svg` : ''}`,
		);
		process.exitCode = report.status === 'completed' ? 0 : 1;
		return;
	}
	if (
		positionals[0] !== 'run' ||
		positionals.length !== 1 ||
		!values.url ||
		(separator >= 0 && !command.length)
	) {
		throw new Error(
			'Use run --url <instance> [-- <workload>] or report <run-directory>. See --help.',
		);
	}
	const controller = new AbortController();
	const interrupt = () => controller.abort(new Error('Capture interrupted.'));
	process.once('SIGINT', interrupt);
	process.once('SIGTERM', interrupt);
	const input = command.length
		? undefined
		: createInterface({ input: process.stdin, output: process.stdout });
	input?.once('SIGINT', interrupt);
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
			input ?? noInput(),
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
