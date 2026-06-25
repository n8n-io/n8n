/**
 * Aggregates N `run-report.json` files into a `sizing-matrix.json`.
 *
 *   npx tsx packages/testing/playwright/scripts/sizing-matrix-aggregate.ts \
 *     --input <dir> [--out <file>] [--mapping <file>]
 *
 *   CURRENTS_API_KEY=… ... --currents-run <runId>
 *
 * In `--input` mode the report can be either a loose `run-report.json` file or
 * an inline base64 attachment inside a Playwright `test-results.json` (how the
 * benchmark lanes emit it). Inline attachments are decoded to loose files first
 * so the filesystem scan picks them up — no Currents/secret coupling needed.
 *
 * Hardware defaults to the Blacksmith CI runner (8 vCPU / 16 GB). Override
 * via `--hardware-runner/--hardware-vcpu/--hardware-ram-gb` or
 * `SIZING_MATRIX_RUNNER/VCPU/RAM_GB` env when running off-CI, or the matrix
 * will mis-attribute the source.
 */

import type { JSONReport, JSONReportSuite } from '@playwright/test/reporter';
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';

const CURRENTS_API = 'https://api.currents.dev/v1';

const RUN_REPORT_ATTACHMENT = 'run-report.json';

// Repo root anchored to this file's location, so version/sha auto-detection
// works regardless of the cwd the script is invoked from.
const REPO_ROOT = resolve(__dirname, '../../../..');

import type { RunReport } from '../utils/benchmark/run-report';
import {
	aggregate,
	renderMarkdown,
	type AggregateInput,
	type HardwareInfo,
	type SpecMapping,
} from '../utils/benchmark/sizing-matrix';
import { DEFAULT_MAPPING } from './sizing-matrix-topologies';

const DEFAULT_HARDWARE: HardwareInfo = {
	runner: 'blacksmith-8vcpu-ubuntu-2204',
	vcpu: 8,
	ramGb: 16,
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
		const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'packages/cli/package.json'), 'utf8')) as {
			version?: string;
		};
		return pkg.version ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

function readGitSha(): string {
	try {
		const head = readFileSync(join(REPO_ROOT, '.git/HEAD'), 'utf8').trim();
		if (head.startsWith('ref: ')) {
			const refPath = head.slice(5);
			return readFileSync(join(REPO_ROOT, '.git', refPath), 'utf8')
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

function findFiles(root: string, match: (path: string) => boolean): string[] {
	const found: string[] = [];
	const stack = [root];
	while (stack.length) {
		const current = stack.pop();
		if (!current) continue;
		const stat = statSync(current);
		if (stat.isFile()) {
			if (match(current)) found.push(current);
			continue;
		}
		if (!stat.isDirectory()) continue;
		for (const entry of readdirSync(current)) {
			stack.push(join(current, entry));
		}
	}
	return found.sort();
}

function findRunReports(root: string): string[] {
	return findFiles(root, (p) => p.endsWith('.json') && p.includes('run-report'));
}

/** Decodes every `run-report.json` attachment in a Playwright JSON report. */
function collectRunReportBodies(suites: JSONReportSuite[]): string[] {
	const bodies: string[] = [];
	const walk = (suite: JSONReportSuite): void => {
		for (const spec of suite.specs ?? []) {
			for (const test of spec.tests ?? []) {
				for (const result of test.results ?? []) {
					for (const attachment of result.attachments ?? []) {
						if (attachment.name === RUN_REPORT_ATTACHMENT && attachment.body) {
							bodies.push(Buffer.from(attachment.body, 'base64').toString('utf8'));
						}
					}
				}
			}
		}
		for (const child of suite.suites ?? []) walk(child);
	};
	for (const suite of suites) walk(suite);
	return bodies;
}

/**
 * Each benchmark lane uploads its Playwright `test-results.json`, which carries
 * the run-report as an inline base64 attachment (from
 * `testInfo.attach('run-report.json', { body })`) rather than as a loose file.
 * The filesystem scan in `findRunReports` only sees loose files, so decode each
 * inline attachment to a loose `run-report.*.json` next to its source report
 * first. Returns the number of reports written. Idempotent across re-runs.
 */
export function extractInlineRunReports(root: string): number {
	let extracted = 0;
	for (const file of findFiles(root, (p) => basename(p) === 'test-results.json')) {
		let report: JSONReport;
		try {
			report = JSON.parse(readFileSync(file, 'utf8')) as JSONReport;
		} catch (error) {
			console.warn(`[sizing-matrix] Failed to parse ${file}: ${(error as Error).message}`);
			continue;
		}
		const bodies = collectRunReportBodies(report.suites ?? []);
		const laneDir = dirname(file);
		const label = sanitiseFilename(relative(root, laneDir) || 'lane');
		bodies.forEach((body, index) => {
			writeFileSync(join(laneDir, `${label}.run-report.${index}.json`), body);
			extracted++;
		});
	}
	return extracted;
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
		const extracted = extractInlineRunReports(args.input);
		if (extracted > 0) {
			console.log(
				`[sizing-matrix] Extracted ${extracted} inline run-report.json attachment(s) from test-results.json`,
			);
		}
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

if (require.main === module) {
	main().catch((error) => {
		console.error(`[sizing-matrix] ${(error as Error).message}`);
		process.exit(1);
	});
}
