/**
 * Aggregates N `run-report.json` files into a `sizing-matrix.json`.
 *
 *   npx tsx packages/testing/playwright/scripts/sizing-matrix-aggregate.ts \
 *     --input <dir> [--out <file>] [--mapping <file>]
 *
 *   CURRENTS_API_KEY=… ... --currents-run <runId>
 *
 * Hardware defaults to the Blacksmith CI runner (8 vCPU / 16 GB). Override
 * via `--hardware-runner/--hardware-vcpu/--hardware-ram-gb` or
 * `SIZING_MATRIX_RUNNER/VCPU/RAM_GB` env when running off-CI, or the matrix
 * will mis-attribute the source.
 */

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const CURRENTS_API = 'https://api.currents.dev/v1';

import type { RunReport } from '../utils/benchmark/run-report';
import {
	aggregate,
	renderMarkdown,
	type AggregateInput,
	type HardwareInfo,
	type SpecMapping,
	type Topology,
} from '../utils/benchmark/sizing-matrix';

const DEFAULT_HARDWARE: HardwareInfo = {
	runner: 'blacksmith-8vcpu-ubuntu-2204',
	vcpu: 8,
	ramGb: 16,
};

const S0_SINGLE_MAIN: Topology = {
	mains: 1,
	webhookProcs: 0,
	workers: 0,
	mainVcpu: 2,
	mainRamGb: 4,
	pgVcpu: 2,
	pgRamGb: 4,
	redisVcpu: 1,
	redisRamGb: 1,
};

const S1_QUEUE_BASELINE: Topology = {
	...S0_SINGLE_MAIN,
	workers: 1,
	workerVcpu: 2,
	workerRamGb: 4,
};

const S1_DEDICATED_PROC_BASELINE: Topology = {
	...S1_QUEUE_BASELINE,
	webhookProcs: 1,
};

const S2_DEDICATED_PROC_2WP_1W: Topology = {
	...S1_DEDICATED_PROC_BASELINE,
	webhookProcs: 2,
};

const S2_DEDICATED_PROC_2WP_2W: Topology = {
	...S2_DEDICATED_PROC_2WP_1W,
	workers: 2,
};

// Webhook and kafka triggers collapse into the same cell — shape is workload
// archetype, not ingress protocol.
const DEFAULT_MAPPING: SpecMapping = {
	'webhook/webhook-single-instance.spec.ts': {
		scale: 'S0',
		shape: 'L',
		topology: S0_SINGLE_MAIN,
	},
	'webhook/webhook-dedicated-proc-baseline.spec.ts': {
		scale: 'S1',
		shape: 'L',
		topology: S1_DEDICATED_PROC_BASELINE,
	},
	'webhook/webhook-dedicated-proc-2wp-1w.spec.ts': {
		scale: 'S2',
		shape: 'L',
		topology: S2_DEDICATED_PROC_2WP_1W,
	},
	'webhook/webhook-dedicated-proc-2wp-2w.spec.ts': {
		scale: 'S2',
		shape: 'L',
		topology: S2_DEDICATED_PROC_2WP_2W,
	},
	'webhook/webhook-save-data-overhead.spec.ts': {
		scale: 'S1',
		shape: 'D',
		topology: S1_DEDICATED_PROC_BASELINE,
	},
	// `webhook-sync-latency-floor` is deliberately unmapped — measures latency at
	// fixed concurrency, not throughput, and distorts the S1-L distribution.
	'kafka/single-instance-ceiling.spec.ts': {
		scale: 'S0',
		shape: 'L',
		topology: S0_SINGLE_MAIN,
	},
	'kafka/queue-mode-sustained-rate.spec.ts': {
		scale: 'S1',
		shape: 'L',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/burst-drain-capacity.spec.ts': {
		scale: 'S1',
		shape: 'L',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/node-count-scaling.spec.ts': {
		scale: 'S1',
		shape: 'X',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/output-size-impact.spec.ts': {
		scale: 'S1',
		shape: 'D',
		topology: S1_QUEUE_BASELINE,
	},
	'kafka/steady-rate-breaking-point.spec.ts': {
		scale: 'S0',
		shape: 'X',
		topology: S0_SINGLE_MAIN,
	},
};

interface CliArgs {
	input?: string;
	currentsRun?: string;
	mapping?: string;
	out: string;
	markdownOut?: string;
	n8nVersion: string;
	commitSha: string;
	hardware: HardwareInfo;
}

function parseArgs(argv: string[]): CliArgs {
	const args: Record<string, string> = {};
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token?.startsWith('--')) continue;
		const key = token.slice(2);
		const value = argv[i + 1];
		if (value && !value.startsWith('--')) {
			args[key] = value;
			i++;
		} else {
			args[key] = 'true';
		}
	}
	if (!args.input && !args['currents-run']) {
		throw new Error('Either --input <dir> or --currents-run <runId> is required');
	}
	return {
		input: args.input ? resolve(args.input) : undefined,
		currentsRun: args['currents-run'],
		mapping: args.mapping ? resolve(args.mapping) : undefined,
		out: resolve(args.out ?? 'sizing-matrix.json'),
		markdownOut: args['markdown-out'] ? resolve(args['markdown-out']) : undefined,
		n8nVersion: args['n8n-version'] ?? readN8nVersion(),
		commitSha: args['commit-sha'] ?? readGitSha(),
		hardware: resolveHardware(args),
	};
}

function resolveHardware(args: Record<string, string>): HardwareInfo {
	const runner =
		args['hardware-runner'] ?? process.env.SIZING_MATRIX_RUNNER ?? DEFAULT_HARDWARE.runner;
	const vcpu = args['hardware-vcpu']
		? Number(args['hardware-vcpu'])
		: process.env.SIZING_MATRIX_VCPU
			? Number(process.env.SIZING_MATRIX_VCPU)
			: DEFAULT_HARDWARE.vcpu;
	const ramGb = args['hardware-ram-gb']
		? Number(args['hardware-ram-gb'])
		: process.env.SIZING_MATRIX_RAM_GB
			? Number(process.env.SIZING_MATRIX_RAM_GB)
			: DEFAULT_HARDWARE.ramGb;
	if (!Number.isFinite(vcpu) || vcpu <= 0) {
		throw new Error(`--hardware-vcpu must be a positive number, got ${args['hardware-vcpu']}`);
	}
	if (!Number.isFinite(ramGb) || ramGb <= 0) {
		throw new Error(`--hardware-ram-gb must be a positive number, got ${args['hardware-ram-gb']}`);
	}
	return { runner, vcpu, ramGb };
}

function readN8nVersion(): string {
	try {
		const pkg = JSON.parse(
			readFileSync(join(process.cwd(), 'packages/cli/package.json'), 'utf8'),
		) as { version?: string };
		return pkg.version ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

function readGitSha(): string {
	try {
		const head = readFileSync(join(process.cwd(), '.git/HEAD'), 'utf8').trim();
		if (head.startsWith('ref: ')) {
			const refPath = head.slice(5);
			return readFileSync(join(process.cwd(), '.git', refPath), 'utf8')
				.trim()
				.slice(0, 12);
		}
		return head.slice(0, 12);
	} catch {
		return 'unknown';
	}
}

function loadMapping(path?: string): SpecMapping {
	if (!path) return DEFAULT_MAPPING;
	const overrides = JSON.parse(readFileSync(path, 'utf8')) as SpecMapping;
	return { ...DEFAULT_MAPPING, ...overrides };
}

interface CurrentsAttachment {
	name: string;
	readUrl: string;
	contentType: string;
}

interface CurrentsRunSpec {
	instanceId: string;
	spec: string;
}

interface CurrentsRunDetails {
	commit?: { sha?: string };
	specs?: CurrentsRunSpec[];
}

interface CurrentsInstanceDetails {
	spec?: string;
	commit?: { sha?: string };
	results?: { attachments?: CurrentsAttachment[] };
}

async function currentsGet<T>(apiKey: string, path: string): Promise<T> {
	const res = await fetch(`${CURRENTS_API}${path}`, {
		headers: { Authorization: `Bearer ${apiKey}` },
	});
	if (!res.ok) {
		throw new Error(`Currents API ${path} failed: ${res.status} ${res.statusText}`);
	}
	const json = (await res.json()) as { data?: T };
	if (!json.data) throw new Error(`Currents API ${path} returned no data field`);
	return json.data;
}

async function fetchCurrentsRun(
	runId: string,
	cacheDir: string,
): Promise<{ reportPaths: string[]; commitSha?: string }> {
	const apiKey = process.env.CURRENTS_API_KEY;
	if (!apiKey) throw new Error('CURRENTS_API_KEY env var required for --currents-run');

	console.log(`[sizing-matrix] Fetching Currents run ${runId}…`);
	const run = await currentsGet<CurrentsRunDetails>(apiKey, `/runs/${runId}`);
	const specs = run.specs ?? [];
	if (specs.length === 0) {
		throw new Error(`Currents run ${runId} has no specs.`);
	}
	console.log(`[sizing-matrix] Run contains ${specs.length} spec instances.`);
	mkdirSync(cacheDir, { recursive: true });

	const reportPaths: string[] = [];
	for (const spec of specs) {
		const instance = await currentsGet<CurrentsInstanceDetails>(
			apiKey,
			`/instances/${spec.instanceId}`,
		);
		const attachment = instance.results?.attachments?.find((a) => a.name === 'run-report.json');
		if (!attachment) {
			console.warn(
				`[sizing-matrix] Spec ${spec.spec} (instance ${spec.instanceId}) has no run-report.json attachment — skipping.`,
			);
			continue;
		}
		const filename = `${sanitiseFilename(spec.spec)}.${spec.instanceId}.json`;
		const outPath = join(cacheDir, filename);
		await downloadTo(attachment.readUrl, outPath);
		reportPaths.push(outPath);
	}
	console.log(
		`[sizing-matrix] Downloaded ${reportPaths.length} run-report.json file(s) → ${cacheDir}`,
	);
	return { reportPaths, commitSha: run.commit?.sha?.slice(0, 12) };
}

async function downloadTo(url: string, outPath: string): Promise<void> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Download ${url} failed: ${res.status}`);
	const buf = Buffer.from(await res.arrayBuffer());
	writeFileSync(outPath, buf);
}

function sanitiseFilename(spec: string): string {
	return spec.replace(/[^a-z0-9._-]+/gi, '-').slice(0, 120);
}

function findRunReports(root: string): string[] {
	const found: string[] = [];
	const stack = [root];
	while (stack.length) {
		const current = stack.pop();
		if (!current) continue;
		const stat = statSync(current);
		if (stat.isFile()) {
			if (current.endsWith('.json') && current.includes('run-report')) found.push(current);
			continue;
		}
		if (!stat.isDirectory()) continue;
		for (const entry of readdirSync(current)) {
			stack.push(join(current, entry));
		}
	}
	return found.sort();
}

function loadReport(path: string): { path: string; report: RunReport } | undefined {
	try {
		const report = JSON.parse(readFileSync(path, 'utf8')) as RunReport;
		if (report.schemaVersion !== 1) {
			console.warn(`[sizing-matrix] Skipping ${path}: schemaVersion ${report.schemaVersion} != 1`);
			return undefined;
		}
		return { path, report };
	} catch (error) {
		console.warn(`[sizing-matrix] Failed to parse ${path}: ${(error as Error).message}`);
		return undefined;
	}
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const mapping = loadMapping(args.mapping);

	let reportPaths: string[];
	let commitSha = args.commitSha;
	if (args.currentsRun) {
		const cacheDir = join(tmpdir(), `sizing-aggregator-cache`, args.currentsRun);
		const fetched = await fetchCurrentsRun(args.currentsRun, cacheDir);
		reportPaths = fetched.reportPaths;
		if (fetched.commitSha) commitSha = fetched.commitSha;
	} else if (args.input) {
		reportPaths = findRunReports(args.input);
	} else {
		throw new Error('Either --input or --currents-run is required');
	}

	const reports = reportPaths
		.map(loadReport)
		.filter((r): r is { path: string; report: RunReport } => r !== undefined);

	if (reports.length === 0) {
		throw new Error(`No valid run-report.json files found`);
	}
	console.log(`[sizing-matrix] Aggregating ${reports.length} run-report.json files…`);

	const input: AggregateInput = {
		reports,
		mapping,
		hardware: args.hardware,
		n8nVersion: args.n8nVersion,
		commitSha,
		runDate: new Date().toISOString(),
	};
	const matrix = aggregate(input);

	mkdirSync(dirname(args.out), { recursive: true });
	writeFileSync(args.out, JSON.stringify(matrix, null, 2));
	console.log(`[sizing-matrix] Wrote ${matrix.cells.length} cell(s) → ${args.out}`);

	if (args.markdownOut) {
		mkdirSync(dirname(args.markdownOut), { recursive: true });
		writeFileSync(args.markdownOut, renderMarkdown(matrix));
		console.log(`[sizing-matrix] Rendered markdown guide → ${args.markdownOut}`);
	}

	for (const cell of matrix.cells) {
		const shapeKeys = Object.keys(cell.shapes);
		console.log(`  ${cell.scale}: shapes [${shapeKeys.join(', ')}]`);
		for (const shape of shapeKeys) {
			const r = cell.shapes[shape as keyof typeof cell.shapes];
			if (!r) continue;
			console.log(
				`    ${shape}: ceiling=${r.ceilingExecPerSec.p50.toFixed(1)}/s ` +
					`green=${r.greenSustainedExecPerSec.toFixed(1)}/s ` +
					`p99=${r.latency.p99.toFixed(0)}ms ` +
					`workloadIops=${r.io.workloadIopsPerSec.toFixed(0)} ` +
					`overhead=${r.io.overheadFactor.toFixed(2)}x ` +
					`bottleneck=${r.bottleneck} ` +
					`verdict=${r.verdict} ` +
					`(n=${r.ceilingExecPerSec.n})`,
			);
		}
	}
}

main().catch((error) => {
	console.error(`[sizing-matrix] ${(error as Error).message}`);
	process.exit(1);
});
