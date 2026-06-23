/**
 * Aggregated sizing-matrix artifact emitted from N `run-report.json` files.
 *
 * Schema lock: DEVP-185. The matrix is two-axis — scale (S0–S4 throughput
 * slices) × shape (L/D/A/X workload archetypes). Each cell carries a
 * topology (output, not input) and a per-shape result that collapses ≥3
 * cold runs into `{p50, p95, max, n}`. v0 tolerates `n=1` cells and marks
 * verdict='amber' so the renderer can flag low-confidence data.
 */

import type { RunReport, ServiceMetrics } from './run-report';

export type Scale = 'S0' | 'S1' | 'S2' | 'S3' | 'S4';
export type Shape = 'L' | 'D' | 'A' | 'X';
export type Verdict = 'green' | 'amber' | 'red';
export type Bottleneck = 'main-cpu' | 'pg-cpu' | 'worker-cpu' | 'queue' | 'network';

export interface Topology {
	mains: number;
	webhookProcs: number;
	workers: number;
	/**
	 * Total in-flight job slots across the queue workers — `workers ×` the
	 * per-worker `--concurrency`. `0` when there are no dedicated workers
	 * (single-main topologies run executions in-process).
	 */
	concurrency: number;
	mainVcpu: number;
	mainRamGb: number;
	workerVcpu?: number;
	workerRamGb?: number;
	pgVcpu: number;
	pgRamGb: number;
	pgIops?: number;
	redisVcpu: number;
	redisRamGb: number;
}

export interface HardwareInfo {
	runner: string;
	vcpu: number;
	ramGb: number;
}

export interface SourceRun {
	runReportPath: string;
	commitSha: string;
	spec: string;
}

export interface PercentileSummary {
	p50: number;
	p95: number;
	max: number;
	n: number;
}

export interface ShapeResult {
	ceilingExecPerSec: PercentileSummary;
	/** Steady-state ceiling — closer to the architectural limit than total exec/sec. */
	tailExecPerSec?: PercentileSummary;
	reqPerSec?: PercentileSummary;
	latency: { p50: number; p975: number; p99: number };
	headroomAtCeiling: {
		mainCpuPct: number;
		workerCpuPct?: number;
		pgCpuPct: number;
		pgCpuPctPeak: number;
		pgBufferHit: number;
		eventLoopLagMs: number;
	};
	io: {
		/** `pg_stat_io` `client backend` (reads+writes+extends) / sec. */
		workloadIopsPerSec: number;
		/** Sum of bgwriter + checkpointer + walwriter + autovacuum + standalone, per sec. */
		overheadIopsPerSec: number;
		/** Ratio total / workload. ~1.0 means workload-dominated; >1.5 means overhead-heavy. */
		overheadFactor: number;
		walMbPerSec: number;
		walRecordsPerSec: number;
	};
	bottleneck: Bottleneck;
	verdict: Verdict;
	/** Derived: throughput at which all headroom signals would stay green. */
	greenSustainedExecPerSec: number;
	sourceRuns: SourceRun[];
}

export interface SizingCell {
	scale: Scale;
	topology: Topology;
	shapes: Partial<Record<Shape, ShapeResult>>;
}

export interface SizingMatrix {
	schemaVersion: 1;
	n8nVersion: string;
	commitSha: string;
	runDate: string;
	hardware: HardwareInfo;
	cells: SizingCell[];
}

/** Maps each benchmark spec path to its cell coordinates. */
export interface SpecMapping {
	[specPath: string]: {
		scale: Scale;
		shape: Shape;
		topology: Topology;
	};
}

export interface AggregateInput {
	reports: Array<{ path: string; report: RunReport }>;
	mapping: SpecMapping;
	hardware: HardwareInfo;
	n8nVersion: string;
	commitSha: string;
	runDate?: string;
}

const GREEN_THRESHOLDS = {
	mainCpuPct: 75,
	pgCpuPct: 70,
	eventLoopLagMs: 25,
	httpP99Ms: 100,
} as const;

const AMBER_THRESHOLDS = {
	mainCpuPct: 85,
	pgCpuPct: 85,
	eventLoopLagMs: 100,
	httpP99Ms: 500,
} as const;

export function aggregate(input: AggregateInput): SizingMatrix {
	const groups = groupByCell(input.reports, input.mapping);
	const cells = Array.from(groups.entries())
		.map(([key, entries]) => buildCell(key, entries))
		.sort(byScale);

	return {
		schemaVersion: 1,
		n8nVersion: input.n8nVersion,
		commitSha: input.commitSha,
		runDate: input.runDate ?? new Date().toISOString(),
		hardware: input.hardware,
		cells,
	};
}

interface CellGroupEntry {
	scale: Scale;
	shape: Shape;
	topology: Topology;
	path: string;
	report: RunReport;
}

function groupByCell(
	reports: Array<{ path: string; report: RunReport }>,
	mapping: SpecMapping,
): Map<Scale, CellGroupEntry[]> {
	const byScale = new Map<Scale, CellGroupEntry[]>();
	for (const { path, report } of reports) {
		const cellCoord = findMapping(path, report, mapping);
		if (!cellCoord) {
			console.warn(
				`[sizing-matrix] No mapping for spec "${report.scenario.spec}" (file: ${path}) — skipping.`,
			);
			continue;
		}
		const entry: CellGroupEntry = { ...cellCoord, path, report };
		const existing = byScale.get(cellCoord.scale) ?? [];
		existing.push(entry);
		byScale.set(cellCoord.scale, existing);
	}
	return byScale;
}

// First-match-wins: tries path, spec title, and normalised title against each key.
function findMapping(path: string, report: RunReport, mapping: SpecMapping) {
	const candidates = [path, report.scenario.spec, normaliseSpecTitle(report.scenario.spec)];
	for (const [key, value] of Object.entries(mapping)) {
		const fragment = key.toLowerCase();
		const fileStem =
			key
				.split('/')
				.pop()
				?.replace(/\.spec\.ts$/, '') ?? '';
		const stemFragment = fileStem.toLowerCase();
		for (const candidate of candidates) {
			const haystack = candidate.toLowerCase();
			if (haystack.includes(fragment)) return value;
			if (stemFragment && haystack.includes(stemFragment)) return value;
		}
	}
	return undefined;
}

function normaliseSpecTitle(title: string): string {
	return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function buildCell(scale: Scale, entries: CellGroupEntry[]): SizingCell {
	const topology = entries[0]?.topology;
	if (!topology) throw new Error(`No entries for scale ${scale}`);

	const byShape = new Map<Shape, CellGroupEntry[]>();
	for (const entry of entries) {
		const list = byShape.get(entry.shape) ?? [];
		list.push(entry);
		byShape.set(entry.shape, list);
	}

	const shapes: SizingCell['shapes'] = {};
	for (const [shape, group] of byShape.entries()) {
		shapes[shape] = buildShapeResult(group);
	}

	return { scale, topology, shapes };
}

function buildShapeResult(group: CellGroupEntry[]): ShapeResult {
	const perRun = group.map((entry) => projectRun(entry));
	const execs = perRun.map((r) => r.execPerSec).filter((v) => v > 0);
	const tailExecs = perRun
		.map((r) => r.tailExecPerSec)
		.filter((v): v is number => v !== undefined && v > 0);
	const reqs = perRun.map((r) => r.reqPerSec).filter((v): v is number => v !== undefined && v > 0);
	const latP50 = mean(perRun.map((r) => r.latency.p50).filter((v) => v > 0));
	const latP975 = mean(perRun.map((r) => r.latency.p975).filter((v) => v > 0));
	const latP99 = mean(perRun.map((r) => r.latency.p99).filter((v) => v > 0));

	const headroom = headroomFromGroup(group);
	const ioMetrics = ioFromGroup(group);
	const bottleneck = detectBottleneck(headroom, latP99);
	const verdict = scoreVerdict(headroom, latP99, group.length);

	// Median of per-run green projections, capped at observed ceiling.
	const ceilingMax = execs.length ? Math.max(...execs) : 0;
	const perRunGreens = perRun.map((r) => r.greenProjection).filter((v) => v > 0);
	const greenMedian = perRunGreens.length ? median(perRunGreens) : 0;
	const greenSustainedExecPerSec = Math.min(greenMedian, ceilingMax);

	return {
		ceilingExecPerSec: summarise(execs),
		tailExecPerSec: tailExecs.length ? summarise(tailExecs) : undefined,
		reqPerSec: reqs.length ? summarise(reqs) : undefined,
		latency: { p50: latP50, p975: latP975, p99: latP99 },
		headroomAtCeiling: headroom,
		io: ioMetrics,
		bottleneck,
		verdict,
		greenSustainedExecPerSec,
		sourceRuns: group.map((g) => ({
			runReportPath: g.path,
			commitSha: extractSha(g.report) ?? 'unknown',
			spec: g.report.scenario.spec,
		})),
	};
}

interface PerRunProjection {
	execPerSec: number;
	tailExecPerSec?: number;
	reqPerSec?: number;
	latency: { p50: number; p975: number; p99: number };
	greenProjection: number;
}

// Projects "rate sustainable at green headroom" using this run's own CPU/lag.
function projectRun(entry: CellGroupEntry): PerRunProjection {
	const t = entry.report.throughput;
	const execPerSec = t.execPerSec ?? 0;
	const mainCpu = entry.report.containers.find((c) => c.name === 'n8n-main')?.cpuPct ?? 0;
	const pgCpu = entry.report.containers.find((c) => c.name === 'postgres')?.cpuPct ?? 0;
	const lag =
		entry.report.services
			.filter((s): s is Extract<ServiceMetrics, { kind: 'n8n-main' }> => s.kind === 'n8n-main')
			.map((s) => (s.eventLoopLagSec ?? 0) * 1000)[0] ?? 0;

	const mainFactor = mainCpu > 0 ? GREEN_THRESHOLDS.mainCpuPct / mainCpu : Infinity;
	const pgFactor = pgCpu > 0 ? GREEN_THRESHOLDS.pgCpuPct / pgCpu : Infinity;
	const lagFactor = lag > 0 ? GREEN_THRESHOLDS.eventLoopLagMs / lag : Infinity;
	const limit = Math.min(mainFactor, pgFactor, lagFactor);
	const greenProjection = Number.isFinite(limit) ? execPerSec * limit : execPerSec;

	return {
		execPerSec,
		tailExecPerSec: t.tailExecPerSec,
		reqPerSec: t.reqPerSec,
		latency: {
			p50: t.p50Ms ?? 0,
			p975: t.p97_5Ms ?? 0,
			p99: t.p99Ms ?? 0,
		},
		greenProjection,
	};
}

function headroomFromGroup(group: CellGroupEntry[]): ShapeResult['headroomAtCeiling'] {
	const mainCpu = mean(definedNumbers(group, (g) => containerValues(g, 'n8n-main', 'cpuPct')));
	const workerVals = group.flatMap((g) => containerValues(g, 'n8n-worker', 'cpuPct'));
	const workerDefined = workerVals.filter(isNumber);
	const workerCpu = workerDefined.length ? mean(workerDefined) : undefined;
	const pgCpuAvg = mean(definedNumbers(group, (g) => containerValues(g, 'postgres', 'cpuPct')));
	const pgCpuPeak = mean(
		definedNumbers(group, (g) => containerValues(g, 'postgres', 'cpuPctPeak')),
	);
	const eventLoopLagMs = mean(
		group.flatMap((g) =>
			g.report.services
				.filter((s): s is Extract<ServiceMetrics, { kind: 'n8n-main' }> => s.kind === 'n8n-main')
				.map((s) => (s.eventLoopLagSec ?? 0) * 1000),
		),
	);
	const pgBufferHit = mean(
		group.flatMap((g) =>
			g.report.services
				.filter((s): s is Extract<ServiceMetrics, { kind: 'postgres' }> => s.kind === 'postgres')
				.map((s) => s.saturation.bufferHitRatio ?? 0),
		),
	);

	return {
		mainCpuPct: mainCpu,
		workerCpuPct: workerCpu,
		pgCpuPct: pgCpuAvg,
		pgCpuPctPeak: pgCpuPeak,
		pgBufferHit,
		eventLoopLagMs,
	};
}

function ioFromGroup(group: CellGroupEntry[]): ShapeResult['io'] {
	const perRun = group.map((g) => derivePerRunIo(g.report));
	const workloadIopsPerSec = mean(perRun.map((r) => r.workload));
	const overheadIopsPerSec = mean(perRun.map((r) => r.overhead));
	const overheadFactor =
		workloadIopsPerSec > 0 ? (workloadIopsPerSec + overheadIopsPerSec) / workloadIopsPerSec : 0;
	const walMbPerSec = mean(perRun.map((r) => r.walMbPerSec));
	const walRecordsPerSec = mean(perRun.map((r) => r.walRecordsPerSec));
	return {
		workloadIopsPerSec,
		overheadIopsPerSec,
		overheadFactor,
		walMbPerSec,
		walRecordsPerSec,
	};
}

function derivePerRunIo(report: RunReport): {
	workload: number;
	overhead: number;
	walMbPerSec: number;
	walRecordsPerSec: number;
} {
	const elapsedSec = (report.duration.totalMs ?? 1) / 1000;
	const pg = report.services.find(
		(s): s is Extract<ServiceMetrics, { kind: 'postgres' }> => s.kind === 'postgres',
	);
	if (!pg) {
		return { workload: 0, overhead: 0, walMbPerSec: 0, walRecordsPerSec: 0 };
	}
	const sumIo = (filter: (b: string) => boolean) =>
		pg.io
			.filter((row) => filter(row.backendType))
			.reduce((acc, row) => acc + row.reads + row.writes + row.extends, 0);

	const workloadOps = sumIo((b) => b === 'client backend');
	const overheadOps = sumIo(
		(b) =>
			b === 'background writer' ||
			b === 'checkpointer' ||
			b === 'walwriter' ||
			b === 'autovacuum worker' ||
			b === 'autovacuum launcher' ||
			b === 'standalone backend',
	);

	return {
		workload: workloadOps / elapsedSec,
		overhead: overheadOps / elapsedSec,
		walMbPerSec: pg.saturation.walMbPerSec ?? 0,
		walRecordsPerSec: pg.saturation.walRecordsPerSec ?? 0,
	};
}

function detectBottleneck(headroom: ShapeResult['headroomAtCeiling'], _p99: number): Bottleneck {
	// Classify on resource saturation, not p99 — for async modes p99 is
	// dominated by Bull queue wait and misranked PG-CPU as "network".
	const candidates: Array<[Bottleneck, number]> = [
		['main-cpu', headroom.mainCpuPct / AMBER_THRESHOLDS.mainCpuPct],
		['pg-cpu', headroom.pgCpuPct / AMBER_THRESHOLDS.pgCpuPct],
	];
	if (headroom.workerCpuPct !== undefined) {
		candidates.push(['worker-cpu', headroom.workerCpuPct / AMBER_THRESHOLDS.mainCpuPct]);
	}
	candidates.sort((a, b) => b[1] - a[1]);
	return candidates[0]?.[0] ?? 'main-cpu';
}

function scoreVerdict(
	headroom: ShapeResult['headroomAtCeiling'],
	_p99: number,
	sampleCount: number,
): Verdict {
	// Verdict gates on topology health (CPU/PG/event-loop), not p99 — same
	// rationale as detectBottleneck. p99 still surfaces in the cell display.
	if (sampleCount < 3) return 'amber';
	const anyRed =
		headroom.mainCpuPct > AMBER_THRESHOLDS.mainCpuPct ||
		headroom.pgCpuPct > AMBER_THRESHOLDS.pgCpuPct ||
		headroom.eventLoopLagMs > AMBER_THRESHOLDS.eventLoopLagMs;
	if (anyRed) return 'red';
	const anyAmber =
		headroom.mainCpuPct > GREEN_THRESHOLDS.mainCpuPct ||
		headroom.pgCpuPct > GREEN_THRESHOLDS.pgCpuPct ||
		headroom.eventLoopLagMs > GREEN_THRESHOLDS.eventLoopLagMs;
	return anyAmber ? 'amber' : 'green';
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
	return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function summarise(values: number[]): PercentileSummary {
	if (values.length === 0) return { p50: 0, p95: 0, max: 0, n: 0 };
	const sorted = [...values].sort((a, b) => a - b);
	return {
		p50: percentile(sorted, 0.5),
		p95: percentile(sorted, 0.95),
		max: sorted[sorted.length - 1] ?? 0,
		n: values.length,
	};
}

function percentile(sortedAsc: number[], p: number): number {
	if (sortedAsc.length === 0) return 0;
	if (sortedAsc.length === 1) return sortedAsc[0] ?? 0;
	const idx = Math.min(sortedAsc.length - 1, Math.floor(p * sortedAsc.length));
	return sortedAsc[idx] ?? 0;
}

function mean(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function isNumber(value: number | undefined): value is number {
	return typeof value === 'number' && !Number.isNaN(value);
}

function containerValues(
	entry: CellGroupEntry,
	name: string,
	field: 'cpuPct' | 'cpuPctPeak',
): Array<number | undefined> {
	return entry.report.containers.filter((c) => c.name === name).map((c) => c[field]);
}

function definedNumbers(
	group: CellGroupEntry[],
	pick: (entry: CellGroupEntry) => Array<number | undefined>,
): number[] {
	return group.flatMap(pick).filter(isNumber);
}

function byScale(a: SizingCell, b: SizingCell): number {
	const order: Scale[] = ['S0', 'S1', 'S2', 'S3', 'S4'];
	return order.indexOf(a.scale) - order.indexOf(b.scale);
}

function extractSha(report: RunReport): string | undefined {
	const value = report.scenario.dimensions['commitSha'];
	return typeof value === 'string' ? value : undefined;
}

/** Renders a `SizingMatrix` to the customer-facing markdown guide. */
export function renderMarkdown(matrix: SizingMatrix): string {
	const lines: string[] = [];
	lines.push('# n8n Self-Hosted Sizing Guide');
	lines.push('');
	lines.push(
		`*Generated for n8n \`${matrix.n8nVersion}\` · commit \`${matrix.commitSha}\` · ${matrix.runDate.slice(0, 10)}*`,
	);
	lines.push('');
	lines.push(
		`*Hardware baseline:* \`${matrix.hardware.runner}\` (${matrix.hardware.vcpu} vCPU / ${matrix.hardware.ramGb} GB).`,
	);
	lines.push('');
	lines.push(
		'> **Status:** generated from the benchmark substrate at every release. ' +
			'Cells with **verdict: amber** are single-run or low-sample — informational, ' +
			'not promotion-ready. Each cell ships **two throughput numbers** — the ' +
			'saturation **ceiling** observed in CI, and the **green-sustained** ' +
			'recommendation derived from headroom thresholds. Size to the green number.',
	);
	lines.push('');

	const shapes: Shape[] = ['L', 'D', 'A', 'X'];
	for (const shape of shapes) {
		const cellsWithShape = matrix.cells.filter((c) => c.shapes[shape]);
		if (cellsWithShape.length === 0) continue;

		lines.push(`## Shape ${shape}`);
		lines.push('');
		lines.push(renderShapeTable(cellsWithShape, shape));
		lines.push('');
		lines.push(renderShapeDetail(cellsWithShape, shape));
		lines.push('');
	}

	lines.push('---');
	lines.push('');
	lines.push('## Methodology');
	lines.push('');
	lines.push(
		'Cells are aggregated by the substrate at `packages/testing/playwright/utils/benchmark/sizing-matrix.ts` from per-run `run-report.json` files. ' +
			"Each cell's headline **ceiling** is the **max** `execPerSec` observed across cold runs (saturation point); full p50/p95/max distribution is shown in cell detail. " +
			'**green-sustained** is the ceiling scaled by headroom (main CPU < 75%, PG CPU < 70%, event-loop lag < 25 ms). ' +
			'**Workload IOPS** is `pg_stat_io` `client backend` reads+writes+extends per second; ' +
			'**overhead factor** is `(workload + bgwriter + checkpointer + walwriter + autovacuum) / workload`. ' +
			'WAL is reported separately (`MB/s`, `records/s`).',
	);
	lines.push('');
	return lines.join('\n');
}

function renderShapeTable(cells: SizingCell[], shape: Shape): string {
	const header =
		'| Scale | Mains | Webhook procs | Workers | PG (vCPU/RAM) | Redis | Burst headroom (≤30 s) exec/s | **Green sustained** exec/s | Req/s | p99 ms | Verdict |';
	const sep = '|---|---:|---:|---:|---|---|---:|---:|---:|---:|---|';
	const rows: string[] = [header, sep];
	for (const cell of cells) {
		const result = cell.shapes[shape];
		if (!result) continue;
		rows.push(
			[
				`**${cell.scale}**`,
				`${cell.topology.mains}× (${cell.topology.mainVcpu} vCPU / ${cell.topology.mainRamGb} GB)`,
				cell.topology.webhookProcs > 0 ? `${cell.topology.webhookProcs}×` : '(in main)',
				cell.topology.workers > 0 && cell.topology.workerVcpu
					? `${cell.topology.workers}× (${cell.topology.workerVcpu} vCPU / ${cell.topology.workerRamGb} GB)`
					: '—',
				`${cell.topology.pgVcpu} vCPU / ${cell.topology.pgRamGb} GB`,
				`${cell.topology.redisVcpu} vCPU / ${cell.topology.redisRamGb} GB`,
				result.ceilingExecPerSec.max.toFixed(1),
				result.greenSustainedExecPerSec.toFixed(1),
				result.reqPerSec ? result.reqPerSec.p50.toFixed(1) : '—',
				result.latency.p99.toFixed(0),
				verdictBadge(result.verdict),
			].join(' | '),
		);
	}
	return rows.join('\n');
}

function renderShapeDetail(cells: SizingCell[], shape: Shape): string {
	const lines: string[] = [];
	lines.push('<details>');
	lines.push(`<summary>Cell detail — Shape ${shape}</summary>`);
	lines.push('');
	for (const cell of cells) {
		const result = cell.shapes[shape];
		if (!result) continue;
		lines.push(`### ${cell.scale}-${shape}  (n=${result.ceilingExecPerSec.n})`);
		lines.push('');
		lines.push('| Field | Value |');
		lines.push('|---|---|');
		lines.push(`| Ceiling exec/s (p50/p95/max) | ${fmtPercentile(result.ceilingExecPerSec)} |`);
		if (result.tailExecPerSec) {
			lines.push(`| Tail exec/s (steady-state) | ${fmtPercentile(result.tailExecPerSec)} |`);
		}
		lines.push(
			`| **Green sustained recommendation** | ${result.greenSustainedExecPerSec.toFixed(1)} exec/s |`,
		);
		lines.push(
			`| Latency p50 / p97.5 / p99 | ${result.latency.p50.toFixed(0)} / ${result.latency.p975.toFixed(0)} / ${result.latency.p99.toFixed(0)} ms |`,
		);
		lines.push(`| Main CPU at ceiling | ${result.headroomAtCeiling.mainCpuPct.toFixed(1)}% |`);
		if (result.headroomAtCeiling.workerCpuPct !== undefined) {
			lines.push(
				`| Worker CPU at ceiling | ${result.headroomAtCeiling.workerCpuPct.toFixed(1)}% |`,
			);
		}
		lines.push(
			`| PG CPU avg / peak | ${result.headroomAtCeiling.pgCpuPct.toFixed(1)}% / ${result.headroomAtCeiling.pgCpuPctPeak.toFixed(1)}% |`,
		);
		lines.push(
			`| PG buffer-hit ratio | ${(result.headroomAtCeiling.pgBufferHit * 100).toFixed(2)}% |`,
		);
		lines.push(`| Event-loop lag | ${result.headroomAtCeiling.eventLoopLagMs.toFixed(1)} ms |`);
		lines.push(`| **Workload IOPS** | ${result.io.workloadIopsPerSec.toFixed(0)} ops/s |`);
		lines.push(
			`| Overhead IOPS (autovac + bgwriter + checkpointer + walwriter) | ${result.io.overheadIopsPerSec.toFixed(0)} ops/s |`,
		);
		lines.push(`| **Overhead factor** | ${result.io.overheadFactor.toFixed(2)}× workload |`);
		lines.push(
			`| WAL throughput | ${result.io.walMbPerSec.toFixed(2)} MB/s · ${result.io.walRecordsPerSec.toFixed(0)} records/s |`,
		);
		lines.push(`| Bottleneck | \`${result.bottleneck}\` |`);
		lines.push(`| Verdict | ${verdictBadge(result.verdict)} |`);
		lines.push(`| Source runs | ${result.sourceRuns.length} |`);
		lines.push('');
		for (const src of result.sourceRuns) {
			lines.push(`- \`${src.spec}\``);
		}
		lines.push('');
	}
	lines.push('</details>');
	return lines.join('\n');
}

function verdictBadge(verdict: Verdict): string {
	if (verdict === 'green') return '🟢 green';
	if (verdict === 'amber') return '🟠 amber (n<3, low confidence)';
	return '🔴 red';
}

function fmtPercentile(p: PercentileSummary): string {
	return `${p.p50.toFixed(1)} / ${p.p95.toFixed(1)} / ${p.max.toFixed(1)}`;
}
