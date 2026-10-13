/**
 * Plain-text report formatter for canvas perf specs. Used in place of ad-hoc
 * `console.log("[CANVAS XXX] foo=… bar=…")` lines so every spec emits one
 * structured, aligned block at the end of the test.
 */

export interface ReportSection {
	heading: string;
	rows: Array<{ label: string; value: string }> | string;
}

const REPORT_WIDTH = 60;
const DIVIDER = '━'.repeat(REPORT_WIDTH);

export function formatReport(title: string, sections: ReportSection[]): string {
	const lines: string[] = ['', DIVIDER, `  ${title}`, DIVIDER, ''];
	for (const section of sections) {
		lines.push(`  ${section.heading}`);
		if (typeof section.rows === 'string') {
			for (const raw of section.rows.split('\n')) lines.push(`    ${raw}`);
		} else {
			const labelWidth = Math.max(...section.rows.map((row) => row.label.length));
			for (const { label, value } of section.rows) {
				lines.push(`    ${label.padEnd(labelWidth + 4)} ${value}`);
			}
		}
		lines.push('');
	}
	return lines.join('\n');
}

export function formatTable(
	headers: string[],
	rows: string[][],
	alignments: Array<'left' | 'right'> = [],
): string {
	const widths = headers.map((header, column) =>
		Math.max(header.length, ...rows.map((row) => (row[column] ?? '').length)),
	);
	const padCell = (text: string, column: number): string => {
		const width = widths[column];
		return (alignments[column] ?? 'left') === 'right' ? text.padStart(width) : text.padEnd(width);
	};
	const headerLine = headers.map((header, column) => padCell(header, column)).join('  ');
	const separator = widths.map((width) => '─'.repeat(width)).join('  ');
	const bodyLines = rows.map((row) =>
		row.map((cell, column) => padCell(cell ?? '', column)).join('  '),
	);
	return [headerLine, separator, ...bodyLines].join('\n');
}

export const fmt = {
	ms: (value: number): string => `${value.toFixed(0)} ms`,
	mb: (value: number): string => `${value.toFixed(1)} MB`,
	count: (value: number): string => Math.round(value).toLocaleString('en-US'),
	bytes: (value: number): string => `${(value / (1024 * 1024)).toFixed(2)} MB`,
	gb: (value: number): string => `${value.toFixed(2)} GB`,
};

/**
 * Turn a render tracker's per-component map into the top-N re-rendering
 * components, formatted as report rows. Returns an empty list for an empty
 * map so callers can spread it without branching.
 */
export function topComponentRows(
	byComponent: Record<string, number>,
	limit = 6,
): Array<{ label: string; value: string }> {
	return Object.entries(byComponent)
		.sort(([, a], [, b]) => b - a)
		.slice(0, limit)
		.map(([name, count]) => ({ label: name, value: fmt.count(count) }));
}

/**
 * Pick the first non-nullish argument. Used to fold "this value or the
 * previous one" assignments out of test bodies so they don't trip
 * playwright/no-conditional-in-test.
 */
export function firstDefined<T>(...values: Array<T | null | undefined>): T | null {
	for (const value of values) {
		if (value !== null && value !== undefined) return value;
	}
	return null;
}

/**
 * Build the section list for a canvas-execution test report. Folds the
 * conditional "include post-exec heap section if captured" logic into a
 * helper so the test body stays branch-free.
 */
export function buildExecutionReportSections(args: {
	v8HeapLimitGb: number | null;
	execRows: string[][];
	postExecHeap: { server: number; browser: number } | null;
	heavyRenderStats?: { byComponent: Record<string, number> } | null;
}): ReportSection[] {
	const v8Value = args.v8HeapLimitGb === null ? 'n/a' : fmt.gb(args.v8HeapLimitGb);
	const sections: ReportSection[] = [
		{ heading: 'Browser', rows: [{ label: 'V8 heap limit', value: v8Value }] },
		{
			heading: 'Executions',
			rows: formatTable(['Scenario', 'Pin bytes', 'Exec', 'Render', 'Re-renders'], args.execRows, [
				'left',
				'right',
				'right',
				'right',
				'right',
			]),
		},
	];
	if (args.postExecHeap) {
		sections.push({
			heading: 'Post-execution heap (after heavy-concentrated)',
			rows: [
				{ label: 'Server', value: fmt.mb(args.postExecHeap.server) },
				{ label: 'Browser', value: fmt.mb(args.postExecHeap.browser) },
			],
		});
	}
	const topRenderComponents = topComponentRows(args.heavyRenderStats?.byComponent ?? {}, 10);
	if (topRenderComponents.length > 0) {
		sections.push({
			heading: 'Top 10 re-rendering components (after heavy-concentrated)',
			rows: topRenderComponents,
		});
	}
	return sections;
}
