import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { appendFileSync } from 'fs';

interface BenchmarkRow {
	trigger: string;
	suite: string;
	scenario: string;
	metrics: Map<string, number>;
}

interface Column {
	header: string;
	suffixes: string[];
	format: (value: number) => string;
}

const COLUMNS: Column[] = [
	{
		header: 'exec/s',
		suffixes: ['throughput', 'exec-per-sec'],
		format: (v) => v.toFixed(1),
	},
	{
		header: 'actions/s',
		suffixes: ['actions-per-sec'],
		format: (v) => v.toFixed(1),
	},
	{
		header: 'p50',
		suffixes: ['duration-p50', 'http-latency-p50'],
		format: (v) => `${v.toFixed(0)}ms`,
	},
	{
		header: 'p99',
		suffixes: ['duration-p99', 'http-latency-p99'],
		format: (v) => `${v.toFixed(0)}ms`,
	},
	{
		header: 'req/s',
		suffixes: ['http-requests-avg'],
		format: (v) => v.toFixed(1),
	},
	{
		header: 'errors',
		suffixes: ['http-errors', 'executions-errors'],
		format: (v) => String(v),
	},
	{
		header: 'ev lag',
		suffixes: ['event-loop-lag'],
		format: (v) => `${(v * 1000).toFixed(0)}ms`,
	},
	{
		header: 'pg tx/s',
		suffixes: ['pg-tx-rate'],
		format: (v) => v.toFixed(0),
	},
	{
		header: 'queue',
		suffixes: ['queue-waiting'],
		format: (v) => String(Math.round(v)),
	},
];

function extractTrigger(filePath: string): string {
	// e.g. tests/infrastructure/benchmarks/kafka/foo.spec.ts → kafka
	const match = filePath.match(/benchmarks\/([^/]+)/);
	return match?.[1] ?? 'unknown';
}

function extractSuite(filePath: string): string {
	// e.g. load.spec.ts → load, throughput.spec.ts → throughput
	const filename = filePath.split('/').pop() ?? '';
	if (filename.includes('throughput')) return 'throughput';
	if (filename.includes('load')) return 'load';
	return 'other';
}

function extractMetricSuffix(metricName: string, scenario: string): string | null {
	if (metricName.startsWith(`${scenario}-`)) {
		return metricName.slice(scenario.length + 1);
	}
	return null;
}

class BenchmarkSummaryReporter implements Reporter {
	private rows: BenchmarkRow[] = [];

	onTestEnd(test: TestCase, result: TestResult): void {
		const metricAttachments = result.attachments.filter((a) => a.name.startsWith('metric:'));
		if (metricAttachments.length === 0) return;

		const scenario = test.title;
		const filePath = test.location.file;
		const trigger = extractTrigger(filePath);
		const suite = extractSuite(filePath);
		const metrics = new Map<string, number>();

		for (const attachment of metricAttachments) {
			const fullName = attachment.name.replace('metric:', '');
			const suffix = extractMetricSuffix(fullName, scenario);
			if (suffix) {
				try {
					const data = JSON.parse(attachment.body?.toString() ?? '');
					metrics.set(suffix, data.value);
				} catch (error) {
					console.warn(`[BenchmarkReporter] Malformed metric attachment "${fullName}":`, error);
				}
			}
		}

		if (metrics.size > 0) {
			this.rows.push({ trigger, suite, scenario, metrics });
		}
	}

	onEnd(): void {
		if (this.rows.length === 0) return;

		this.rows.sort(
			(a, b) =>
				a.trigger.localeCompare(b.trigger) ||
				a.suite.localeCompare(b.suite) ||
				a.scenario.localeCompare(b.scenario),
		);

		const triggerWidth = Math.max(7, ...this.rows.map((r) => r.trigger.length));
		const suiteWidth = Math.max(5, ...this.rows.map((r) => r.suite.length));
		const scenarioWidth = Math.max(8, ...this.rows.map((r) => r.scenario.length));
		const colWidths = COLUMNS.map((col) => {
			const values = this.rows.map((r) => this.resolveColumn(r, col));
			return Math.max(col.header.length, ...values.map((v) => v.length));
		});

		const pad = (s: string, w: number) => s.padStart(w);
		const padRight = (s: string, w: number) => s.padEnd(w);

		const headerParts = [
			padRight('Trigger', triggerWidth),
			padRight('Suite', suiteWidth),
			padRight('Scenario', scenarioWidth),
			...COLUMNS.map((col, i) => pad(col.header, colWidths[i])),
		];

		const separator = headerParts.map((h) => '─'.repeat(h.length));

		console.log('\n');
		console.log('Benchmark Summary');
		console.log('═'.repeat(headerParts.join(' │ ').length + 4));
		console.log(`│ ${headerParts.join(' │ ')} │`);
		console.log(`├─${separator.join('─┼─')}─┤`);

		for (const row of this.rows) {
			const parts = [
				padRight(row.trigger, triggerWidth),
				padRight(row.suite, suiteWidth),
				padRight(row.scenario, scenarioWidth),
				...COLUMNS.map((col, i) => pad(this.resolveColumn(row, col), colWidths[i])),
			];
			console.log(`│ ${parts.join(' │ ')} │`);
		}

		console.log(`└─${separator.map((s) => s).join('─┴─')}─┘`);
		console.log('');

		this.writeGitHubSummary();
	}

	private writeGitHubSummary(): void {
		const summaryPath = process.env.GITHUB_STEP_SUMMARY;
		if (!summaryPath) return;

		const headers = ['Trigger', 'Suite', 'Scenario', ...COLUMNS.map((c) => c.header)];
		const lines: string[] = [
			'## Benchmark Summary',
			'',
			`| ${headers.join(' | ')} |`,
			`| ${headers.map((h) => '---'.padEnd(h.length, '-')).join(' | ')} |`,
		];

		for (const row of this.rows) {
			const cells = [
				row.trigger,
				row.suite,
				row.scenario,
				...COLUMNS.map((col) => this.resolveColumn(row, col)),
			];
			lines.push(`| ${cells.join(' | ')} |`);
		}

		lines.push('');
		appendFileSync(summaryPath, lines.join('\n'));
	}

	private resolveColumn(row: BenchmarkRow, col: Column): string {
		for (const suffix of col.suffixes) {
			const value = row.metrics.get(suffix);
			if (value !== undefined) return col.format(value);
		}
		return '—';
	}
}

// eslint-disable-next-line import-x/no-default-export
export default BenchmarkSummaryReporter;
