import type { TestInfo } from '@playwright/test';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { cpus, totalmem } from 'node:os';
import { basename, join } from 'node:path';

import { PHASE_KEYS, type PageLoadSample } from './measure';
import { computeStats, type Stats } from './stats';
import type { PageTarget } from './targets';
import { fmt, formatReport, formatTable } from '../../canvas/helpers/report';

export interface PageResult {
	target: PageTarget;
	samples: PageLoadSample[];
	/** Statistics over the measured (non-warm-up) samples. */
	stats: Record<'usableMs' | 'ttfbMs' | 'fcpMs' | 'dclMs' | 'lcpMs' | 'longTaskMs', Stats>;
	/** The warm-up (first visit) against the average of the measured runs. */
	warmup: { usableMs: number | null; deltaMs: number | null; deltaPct: number | null };
}

export interface RunMeta {
	startedAt: string;
	baseUrl: string;
	iterations: number;
	warmup: number;
	traceMode: string;
	coldCache: boolean;
	gitSha: string | null;
	cpuCores: number;
	memoryGb: number;
}

export function buildRunMeta(run: {
	startedAt: string;
	baseURL: string | undefined;
	iterations: number;
	traceMode: string;
	coldCache: boolean;
}): RunMeta {
	return {
		startedAt: run.startedAt,
		baseUrl: run.baseURL ?? '',
		iterations: run.iterations,
		warmup: 1,
		traceMode: run.traceMode,
		coldCache: run.coldCache,
		gitSha: process.env.GITHUB_SHA ?? null,
		cpuCores: cpus().length,
		memoryGb: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
	};
}

const STAT_KEYS = ['usableMs', 'ttfbMs', 'fcpMs', 'dclMs', 'lcpMs', 'longTaskMs'] as const;

export function summarize(target: PageTarget, samples: PageLoadSample[]): PageResult {
	const measured = samples.filter((sample) => !sample.warmup);
	const stats = Object.fromEntries(
		STAT_KEYS.map((key) => [
			key,
			computeStats(measured.map((sample) => sample[key]).filter((v): v is number => v !== null)),
		]),
	) as PageResult['stats'];
	const warmupSample = samples.find((sample) => sample.warmup);
	const warmupMs = warmupSample ? warmupSample.usableMs : null;
	const deltaMs = warmupMs === null || measured.length === 0 ? null : warmupMs - stats.usableMs.avg;
	const deltaPct =
		deltaMs === null || stats.usableMs.avg === 0 ? null : (deltaMs / stats.usableMs.avg) * 100;
	return { target, samples, stats, warmup: { usableMs: warmupMs, deltaMs, deltaPct } };
}

function signedMs(value: number | null): string {
	if (value === null) return 'n/a';
	return `${value >= 0 ? '+' : ''}${value.toFixed(0)} ms`;
}

function signedPct(value: number | null): string {
	if (value === null) return 'n/a';
	return `${value >= 0 ? '+' : ''}${value.toFixed(0)} %`;
}

const CSV_COLUMNS = [
	'page',
	'routeName',
	'iteration',
	'warmup',
	'traced',
	'usableMs',
	'ttfbMs',
	'fcpMs',
	'dclMs',
	'loadMs',
	'lcpMs',
	'longTasks',
	'longTaskMs',
	'requests',
	'cachedRequests',
	'transferBytes',
	'bodyBytes',
	...PHASE_KEYS.map((key) => `phase_${key}`),
	'tracePath',
];

function csvCell(value: string | number | boolean | null | undefined): string {
	if (value === null || value === undefined) return '';
	const text = typeof value === 'number' ? value.toFixed(1) : String(value);
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(results: PageResult[]): string {
	const rows = results.flatMap(({ target, samples }) =>
		samples.map((sample) =>
			[
				sample.page,
				target.routeName,
				sample.iteration,
				sample.warmup,
				sample.traced,
				sample.usableMs,
				sample.ttfbMs,
				sample.fcpMs,
				sample.dclMs,
				sample.loadMs,
				sample.lcpMs,
				sample.longTasks,
				sample.longTaskMs,
				sample.requests,
				sample.cachedRequests,
				sample.transferBytes,
				sample.bodyBytes,
				...PHASE_KEYS.map((key) => sample.phases[key]),
				sample.tracePath ? basename(sample.tracePath) : null,
			]
				.map(csvCell)
				.join(','),
		),
	);
	return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

export function buildReport(meta: RunMeta, results: PageResult[]): string {
	const rows = results.map(({ target, stats }) => [
		target.label,
		fmt.ms(stats.usableMs.median),
		fmt.ms(stats.usableMs.avg),
		fmt.ms(stats.usableMs.p75),
		fmt.ms(stats.usableMs.p80),
		fmt.ms(stats.usableMs.p90),
		fmt.ms(stats.usableMs.p95),
		fmt.ms(stats.usableMs.p99),
		fmt.ms(stats.usableMs.stddev),
		`${(stats.usableMs.cv * 100).toFixed(0)} %`,
		fmt.ms(stats.usableMs.min),
		fmt.ms(stats.usableMs.max),
	]);
	return formatReport(
		`Editor page load — ${meta.iterations} runs per page after ${meta.warmup} warm-up`,
		[
			{
				heading: 'Run',
				rows: [
					{ label: 'Base URL', value: meta.baseUrl },
					{ label: 'Trace mode', value: meta.traceMode },
					{ label: 'Cold cache', value: meta.coldCache ? 'yes (cleared before warm-up)' : 'no' },
					{ label: 'Host', value: `${meta.cpuCores} cores, ${meta.memoryGb} GB` },
				],
			},
			{
				heading: 'Time to usable',
				rows: formatTable(
					[
						'Page',
						'Median',
						'Avg',
						'p75',
						'p80',
						'p90',
						'p95',
						'p99',
						'Stddev',
						'CV',
						'Min',
						'Max',
					],
					rows,
					['left', ...Array.from({ length: 11 }, (): 'right' => 'right')],
				),
			},
			{
				heading: 'Warm-up (first visit) vs average of the measured runs',
				rows: formatTable(
					['Page', 'Warm-up', 'Avg of runs', 'Diff', 'Diff %'],
					results.map(({ target, stats, warmup }) => [
						target.label,
						warmup.usableMs === null ? 'n/a' : fmt.ms(warmup.usableMs),
						fmt.ms(stats.usableMs.avg),
						signedMs(warmup.deltaMs),
						signedPct(warmup.deltaPct),
					]),
					['left', 'right', 'right', 'right', 'right'],
				),
			},
			{
				heading: 'Runs (ms, in order; the warm-up is in brackets)',
				rows: formatTable(
					['Page', 'Warm-up', 'Measured runs'],
					results.map(({ target, samples }) => [
						target.label,
						`[${samples
							.filter((sample) => sample.warmup)
							.map((sample) => Math.round(sample.usableMs))
							.join(' ')}]`,
						samples
							.filter((sample) => !sample.warmup)
							.map((sample) => Math.round(sample.usableMs))
							.join(' '),
					]),
					['left', 'right', 'left'],
				),
			},
		],
	);
}

export interface WrittenFiles {
	json: string;
	csv: string;
}

/**
 * Writes `page-load.json` (meta, every sample, statistics) and `page-load.csv`
 * (one row per sample) into the test output directory, attaches both to the
 * report, and copies them to `PERF_OUTPUT_DIR` when that is set.
 */
export async function writeResults(
	testInfo: TestInfo,
	meta: RunMeta,
	results: PageResult[],
): Promise<WrittenFiles> {
	const json = testInfo.outputPath('page-load.json');
	const csv = testInfo.outputPath('page-load.csv');
	await mkdir(testInfo.outputDir, { recursive: true });
	await writeFile(
		json,
		JSON.stringify(
			{
				meta,
				pages: results.map(({ target, samples, stats }) => ({ ...target, stats, samples })),
			},
			null,
			2,
		),
	);
	await writeFile(csv, toCsv(results));
	await testInfo.attach('page-load.json', { path: json, contentType: 'application/json' });
	await testInfo.attach('page-load.csv', { path: csv, contentType: 'text/csv' });

	const exportDir = process.env.PERF_OUTPUT_DIR;
	if (exportDir) {
		await mkdir(exportDir, { recursive: true });
		const stamp = meta.startedAt.replace(/[:.]/g, '-');
		await copyFile(json, join(exportDir, `page-load-${stamp}.json`));
		await copyFile(csv, join(exportDir, `page-load-${stamp}.csv`));
		for (const sample of results.flatMap((result) => result.samples)) {
			if (sample.tracePath) {
				await copyFile(sample.tracePath, join(exportDir, `${stamp}-${basename(sample.tracePath)}`));
			}
		}
	}
	return { json, csv };
}
