import { appendFileSync } from 'fs';

import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface BenchmarkRow {
	trigger: string;
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
	{ header: 'p50', suffixes: ['duration-p50'], format: (v) => `${v.toFixed(0)}ms` },
	{ header: 'p95', suffixes: ['duration-p95'], format: (v) => `${v.toFixed(0)}ms` },
	{ header: 'p99', suffixes: ['duration-p99'], format: (v) => `${v.toFixed(0)}ms` },
	{
		header: 'Heap Δ MB',
		suffixes: ['memory-delta'],
		format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
	},
];

function extractTrigger(filePath: string): string {
	// e.g. tests/infrastructure/kafka-load/foo.spec.ts → kafka
	const match = filePath.match(/tests\/(?:infrastructure|performance)\/([^/]+)/);
	if (!match) return 'unknown';
	return match[1].replace(/-load$/, '');
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
		const metrics = new Map<string, number>();

		for (const attachment of metricAttachments) {
			const fullName = attachment.name.replace('metric:', '');
			const suffix = extractMetricSuffix(fullName, scenario);
			if (suffix) {
				try {
					const data = JSON.parse(attachment.body?.toString() ?? '');
					metrics.set(suffix, data.value);
				} catch {
					// skip malformed
				}
			}
		}

		if (metrics.size > 0) {
			this.rows.push({ trigger, scenario, metrics });
		}
	}

	onEnd(): void {
		if (this.rows.length === 0) return;

		this.rows.sort(
			(a, b) => a.trigger.localeCompare(b.trigger) || a.scenario.localeCompare(b.scenario),
		);

		const triggerWidth = Math.max(7, ...this.rows.map((r) => r.trigger.length));
		const scenarioWidth = Math.max(8, ...this.rows.map((r) => r.scenario.length));
		const colWidths = COLUMNS.map((col) => {
			const values = this.rows.map((r) => this.resolveColumn(r, col));
			return Math.max(col.header.length, ...values.map((v) => v.length));
		});

		const pad = (s: string, w: number) => s.padStart(w);
		const padLeft = (s: string, w: number) => s.padEnd(w);

		const headerParts = [
			padLeft('Trigger', triggerWidth),
			padLeft('Scenario', scenarioWidth),
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
				padLeft(row.trigger, triggerWidth),
				padLeft(row.scenario, scenarioWidth),
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

		const headers = ['Trigger', 'Scenario', ...COLUMNS.map((c) => c.header)];
		const lines: string[] = [
			'## Benchmark Summary',
			'',
			`| ${headers.join(' | ')} |`,
			`| ${headers.map((h) => '---'.padEnd(h.length, '-')).join(' | ')} |`,
		];

		for (const row of this.rows) {
			const cells = [
				row.trigger,
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
