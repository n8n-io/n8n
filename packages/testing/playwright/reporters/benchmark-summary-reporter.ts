import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { appendFileSync } from 'fs';

interface BenchmarkRow {
	question: string;
	variant: string;
	verdict: string;
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
		header: 'tail/s',
		suffixes: ['tail-exec-per-sec'],
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

interface MetricPayload {
	value: number;
	unit?: string;
	dimensions?: Record<string, string | number>;
}

interface ParsedMetric {
	name: string;
	value: number;
	dimensions: Record<string, string | number>;
}

function parseMetric(rawName: string, body: string): ParsedMetric | null {
	const name = rawName.replace(/^metric:/, '');
	try {
		const data = JSON.parse(body) as MetricPayload;
		return { name, value: data.value, dimensions: data.dimensions ?? {} };
	} catch {
		return null;
	}
}

function dimensionKey(dimensions: Record<string, string | number>): string {
	// Group rows by (variant, verdict). Same variant+verdict = same row, different = different row.
	const variant = dimensions.variant ?? '';
	const verdict = dimensions.verdict ?? '';
	return `${variant} ${verdict}`;
}

/**
 * For a group of rows under one question, decide which columns / annotations
 * actually have data — anything entirely empty gets hidden so the table
 * doesn't read as a wall of `—`.
 */
interface QuestionShape {
	columns: Column[];
	showVariant: boolean;
	showVerdict: boolean;
}

function shapeFor(rows: BenchmarkRow[]): QuestionShape {
	return {
		columns: COLUMNS.filter((col) => rows.some((r) => col.suffixes.some((s) => r.metrics.has(s)))),
		showVariant: rows.some((r) => r.variant.length > 0),
		showVerdict: rows.some((r) => r.verdict.length > 0),
	};
}

function formatCell(row: BenchmarkRow, col: Column): string {
	for (const suffix of col.suffixes) {
		const value = row.metrics.get(suffix);
		if (value !== undefined) return col.format(value);
	}
	return '—';
}

class BenchmarkSummaryReporter implements Reporter {
	private rows: BenchmarkRow[] = [];

	onTestEnd(test: TestCase, result: TestResult): void {
		const metricAttachments = result.attachments.filter((a) => a.name.startsWith('metric:'));
		if (metricAttachments.length === 0) return;

		// Parse all metric attachments. Group them by their (variant, verdict) signature
		// so a single test that emits multiple variants (e.g. staged ramps) produces
		// multiple reporter rows.
		const groups = new Map<string, ParsedMetric[]>();
		for (const attachment of metricAttachments) {
			const body = attachment.body?.toString() ?? '';
			const parsed = parseMetric(attachment.name, body);
			if (!parsed) continue;
			const key = dimensionKey(parsed.dimensions);
			const existing = groups.get(key) ?? [];
			existing.push(parsed);
			groups.set(key, existing);
		}

		const question = test.parent?.title || test.title;
		const scenario = test.title;

		for (const groupMetrics of groups.values()) {
			const dimensions = groupMetrics[0]?.dimensions ?? {};
			const metrics = new Map<string, number>();
			for (const m of groupMetrics) metrics.set(m.name, m.value);
			if (metrics.size === 0) continue;

			this.rows.push({
				question,
				variant: String(dimensions.variant ?? ''),
				verdict: String(dimensions.verdict ?? ''),
				scenario,
				metrics,
			});
		}
	}

	onEnd(): void {
		if (this.rows.length === 0) return;

		// Stable group: questions appear in the order their first row was added.
		const groups = new Map<string, BenchmarkRow[]>();
		for (const row of this.rows) {
			const list = groups.get(row.question) ?? [];
			list.push(row);
			groups.set(row.question, list);
		}

		console.log('\n');
		console.log('Benchmark Summary');
		console.log('══════════════════');

		for (const [question, rows] of groups) {
			this.renderConsoleQuestion(question, rows);
		}
		console.log('');

		this.writeGitHubSummary(groups);
	}

	private renderConsoleQuestion(question: string, rows: BenchmarkRow[]): void {
		const shape = shapeFor(rows);
		const scenario = rows[0]?.scenario ?? '';

		const headerCells: string[] = [];
		if (shape.showVariant) headerCells.push('Variant');
		if (shape.showVerdict) headerCells.push('Verdict');
		for (const col of shape.columns) headerCells.push(col.header);

		const rowCells: string[][] = rows.map((row) => {
			const cells: string[] = [];
			if (shape.showVariant) cells.push(row.variant || '—');
			if (shape.showVerdict) cells.push(row.verdict || '—');
			for (const col of shape.columns) cells.push(formatCell(row, col));
			return cells;
		});

		const widths = headerCells.map((h, i) =>
			Math.max(h.length, ...rowCells.map((cells) => cells[i].length)),
		);
		const pad = (s: string, w: number) => s.padStart(w);
		const padRight = (s: string, w: number) => s.padEnd(w);
		const padCell = (s: string, w: number, leftAlign: boolean) =>
			leftAlign ? padRight(s, w) : pad(s, w);

		// Variant + Verdict are left-aligned text; metric columns are right-aligned numbers.
		const isText = (i: number) =>
			(shape.showVariant && i === 0) || (shape.showVerdict && i === (shape.showVariant ? 1 : 0));

		console.log('');
		console.log(`▎ ${question}`);
		if (scenario) console.log(`  ${scenario}`);
		console.log(`│ ${headerCells.map((h, i) => padCell(h, widths[i], isText(i))).join(' │ ')} │`);
		console.log(`├─${widths.map((w) => '─'.repeat(w)).join('─┼─')}─┤`);
		for (const cells of rowCells) {
			console.log(`│ ${cells.map((c, i) => padCell(c, widths[i], isText(i))).join(' │ ')} │`);
		}
	}

	private writeGitHubSummary(groups: Map<string, BenchmarkRow[]>): void {
		const summaryPath = process.env.GITHUB_STEP_SUMMARY;
		if (!summaryPath) return;

		const lines: string[] = ['## Benchmark Summary', ''];

		for (const [question, rows] of groups) {
			const shape = shapeFor(rows);
			const scenario = rows[0]?.scenario ?? '';

			lines.push(`### ${question}`);
			if (scenario) {
				lines.push('');
				lines.push(`> ${scenario}`);
			}
			lines.push('');

			const headers: string[] = [];
			if (shape.showVariant) headers.push('Variant');
			if (shape.showVerdict) headers.push('Verdict');
			for (const col of shape.columns) headers.push(col.header);

			lines.push(`| ${headers.join(' | ')} |`);
			lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

			for (const row of rows) {
				const cells: string[] = [];
				if (shape.showVariant) cells.push(row.variant || '—');
				if (shape.showVerdict) cells.push(row.verdict || '—');
				for (const col of shape.columns) cells.push(formatCell(row, col));
				lines.push(`| ${cells.join(' | ')} |`);
			}
			lines.push('');
		}

		// Leading newline so we don't concatenate against whatever a previous
		// reporter wrote earlier in the same job.
		appendFileSync(summaryPath, `\n${lines.join('\n')}`);
	}
}

// eslint-disable-next-line import-x/no-default-export
export default BenchmarkSummaryReporter;
