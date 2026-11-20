import type { TurnKind } from './config';

/** One measured turn. Client times are from the moment the message was sent. */
export interface TurnResult {
	kind: TurnKind;
	ok: boolean;
	error?: string;
	/**
	 * The server refused the turn because it was full (HTTP 503 or a `main_busy`
	 * stream error). This is the designed answer to overload, so it is counted
	 * apart from errors.
	 */
	rejected?: boolean;
	/** Seconds from the `Retry-After` header of a rejection. */
	retryAfterSec?: number;
	/** When the turn was sent, in ms since measuring started. */
	sentAtMs?: number;
	executionId?: string;
	/**
	 * The UUID at the end of the thread ID. Webhook and workflow turns return
	 * no execution ID, so the bench finds their execution by this.
	 */
	sessionId?: string;
	/** Until `execution-started`: queue wait plus dispatch, as the user sees it. */
	startMs?: number;
	/** Until the first text token. */
	firstTokenMs?: number;
	totalMs: number;
	toolCalls: number;
	/** The server accepted the message but opened no live stream. The reply came from the database. */
	detached?: boolean;
	/** From `agent_execution`, joined after the run. */
	db?: {
		status: string;
		ownerKey: string;
		process: string;
		/** startedAt - createdAt */
		queuedMs: number | null;
		/** stoppedAt - startedAt */
		runMs: number | null;
		totalTokens: number;
		cost: number;
	};
}

export interface Stats {
	n: number;
	p50: number | null;
	p95: number | null;
	max: number | null;
}

export interface GroupSummary {
	turns: number;
	/** Failed turns, rejections excluded. */
	errors: number;
	rejected: number;
	start: Stats;
	firstToken: Stats;
	total: Stats;
	dbQueued: Stats;
	dbRun: Stats;
	ranOn: Record<string, number>;
	tokens: number;
	cost: number;
}

export interface TopologyResult {
	topology: string;
	stack: { mains: number; workers: number; agentQueue: boolean; slotsPerWorker?: number };
	/** Turns in flight during the measured run. */
	concurrency?: number;
	wallMs: number;
	turnsPerMinute: number;
	byKind: Record<string, GroupSummary>;
	all: GroupSummary;
	/** CPU and memory while measuring. Absent when no sample was taken. */
	resources?: Resources;
	/** Container limits by role. Memory in GB, CPU in cores. */
	limits?: Partial<Record<'main' | 'worker', { memory?: number; cpu?: number }>>;
	/** Containers that were killed for memory or restarted during the run. */
	killed?: string[];
	/** How the main answered other traffic while agents loaded it. */
	probe?: ProbeSummary;
	/** Executions of the schedule-triggered agent workflow, by status. */
	schedule?: Record<string, number>;
	/** The worker that the bench killed on purpose, and when. */
	chaos?: { killed: string; atMs: number };
	turns: TurnResult[];
}

export type ProbeTarget = 'health' | 'rest' | 'webhook';

export interface ProbePoint {
	/** ms since measuring started */
	t: number;
	target: ProbeTarget;
	ms: number;
	status: number;
}

export interface ProbeSummary {
	targets: Record<ProbeTarget, Stats & { failed: number; slow: number }>;
	/** True when every target stayed inside `PROBE_BUDGET_MS` at p95 and nothing failed. */
	pass: boolean;
	points: ProbePoint[];
}

/**
 * The p95 budget of each probe target. A main that stays inside it still
 * serves the editor, the REST API and production webhooks while agents load it.
 */
export const PROBE_BUDGET_MS: Record<ProbeTarget, number> = {
	health: 500,
	rest: 1000,
	webhook: 1000,
};

export function summariseProbe(points: ProbePoint[]): ProbeSummary {
	const targets = {} as ProbeSummary['targets'];
	let pass = true;
	for (const target of Object.keys(PROBE_BUDGET_MS) as ProbeTarget[]) {
		const mine = points.filter((p) => p.target === target);
		const ok = mine.filter((p) => p.status >= 200 && p.status < 300);
		const s = stats(mine.map((p) => p.ms));
		const failed = mine.length - ok.length;
		const slow = mine.filter((p) => p.ms > PROBE_BUDGET_MS[target]).length;
		targets[target] = { ...s, failed, slow };
		if (failed > 0 || (s.p95 ?? 0) > PROBE_BUDGET_MS[target]) pass = false;
	}
	return { targets, pass, points };
}

export function renderProbe(results: TopologyResult[]): string {
	const lines: string[] = [];
	for (const r of results) {
		if (!r.probe) continue;
		lines.push(`Main probe for ${r.topology}: ${r.probe.pass ? 'PASS' : 'FAIL'}`);
		for (const [target, s] of Object.entries(r.probe.targets)) {
			const budget = PROBE_BUDGET_MS[target as ProbeTarget];
			lines.push(
				`  ${target.padEnd(8)} n=${s.n} p50 ${num(s.p50)} ms · p95 ${num(s.p95)} ms · max ${num(s.max)} ms · over ${budget} ms: ${s.slow} · failed: ${s.failed}`,
			);
		}
		if (r.schedule) {
			lines.push(
				`  schedule-triggered agent workflow: ${Object.entries(r.schedule)
					.map(([status, n]) => `${status} ${n}`)
					.join(', ')}`,
			);
		}
		if (r.chaos) lines.push(`  killed ${r.chaos.killed} at ${Math.round(r.chaos.atMs / 1000)} s`);
	}
	return lines.join('\n');
}

export interface ResourceStats {
	/** Percent of one core. */
	cpu: Stats;
	rssMb: Stats;
	/** Live objects on the JS heap. */
	heapUsedMb: Stats;
	lagMs: Stats;
}

/** One resource sample, as a compact series point. `t` is ms since measuring started. */
export interface ResourcePoint {
	t: number;
	processes: Record<
		string,
		{ cpu: number | null; rssMb: number | null; heapUsedMb: number | null }
	>;
}

export interface Resources {
	processes: Record<string, ResourceStats & { role: string }>;
	/** Sum over every process at each sample. */
	total: Pick<ResourceStats, 'cpu' | 'rssMb'>;
	/** Sum over the workers at each sample. */
	workers?: Pick<ResourceStats, 'cpu' | 'rssMb'>;
	series: ResourcePoint[];
}

interface RawSample {
	t: number;
	processes: Record<
		string,
		{
			cpu: number | null;
			rssMb: number | null;
			heapUsedMb?: number | null;
			lagMs: number | null;
		}
	>;
}

/** Per-process and summed CPU and memory from the samples taken while measuring. */
export function summariseResources(
	samples: RawSample[],
	roles: Record<string, string>,
	measureStartedAt: number,
): Resources | undefined {
	if (samples.length === 0) return undefined;
	const names = Object.keys(roles);
	const pick = (name: string, key: 'cpu' | 'rssMb' | 'heapUsedMb' | 'lagMs') =>
		samples.map((s) => s.processes[name]?.[key]);
	// A sum is only meaningful when every process in it reported.
	const sumOf = (subset: string[], key: 'cpu' | 'rssMb') =>
		samples.map((s) => {
			const values = subset.map((n) => s.processes[n]?.[key]);
			return values.every((v) => typeof v === 'number')
				? values.reduce<number>((a, v) => a + (v ?? 0), 0)
				: null;
		});
	const processes: Resources['processes'] = {};
	for (const name of names) {
		processes[name] = {
			role: roles[name],
			cpu: stats(pick(name, 'cpu')),
			rssMb: stats(pick(name, 'rssMb')),
			heapUsedMb: stats(pick(name, 'heapUsedMb')),
			lagMs: stats(pick(name, 'lagMs')),
		};
	}
	const workerNames = names.filter((n) => roles[n] === 'worker');
	return {
		processes,
		total: { cpu: stats(sumOf(names, 'cpu')), rssMb: stats(sumOf(names, 'rssMb')) },
		...(workerNames.length
			? {
					workers: {
						cpu: stats(sumOf(workerNames, 'cpu')),
						rssMb: stats(sumOf(workerNames, 'rssMb')),
					},
				}
			: {}),
		series: samples.map((s) => ({
			t: s.t - measureStartedAt,
			processes: Object.fromEntries(
				names.map((n) => [
					n,
					{
						cpu: round(s.processes[n]?.cpu),
						rssMb: round(s.processes[n]?.rssMb),
						heapUsedMb: round(s.processes[n]?.heapUsedMb),
					},
				]),
			),
		})),
	};
}

const round = (v: number | null | undefined) =>
	typeof v === 'number' ? Math.round(v * 10) / 10 : null;

function stats(values: Array<number | null | undefined>): Stats {
	const sorted = values
		.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
		.sort((a, b) => a - b);
	const at = (q: number) =>
		sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] : null;
	return { n: sorted.length, p50: at(0.5), p95: at(0.95), max: sorted.at(-1) ?? null };
}

export function summarise(turns: TurnResult[]): GroupSummary {
	const ok = turns.filter((t) => t.ok);
	const rejected = turns.filter((t) => t.rejected).length;
	const ranOn: Record<string, number> = {};
	for (const turn of turns) {
		const where = turn.db?.process ?? 'unknown';
		ranOn[where] = (ranOn[where] ?? 0) + 1;
	}
	return {
		turns: turns.length,
		errors: turns.length - ok.length - rejected,
		rejected,
		start: stats(ok.map((t) => t.startMs)),
		firstToken: stats(ok.map((t) => t.firstTokenMs)),
		total: stats(ok.map((t) => t.totalMs)),
		dbQueued: stats(ok.map((t) => t.db?.queuedMs)),
		dbRun: stats(ok.map((t) => t.db?.runMs)),
		ranOn,
		tokens: turns.reduce((sum, t) => sum + (t.db?.totalTokens ?? 0), 0),
		cost: turns.reduce((sum, t) => sum + (t.db?.cost ?? 0), 0),
	};
}

const ms = (s: Stats) =>
	s.p50 === null ? '-' : `${Math.round(s.p50)} / ${Math.round(s.p95 ?? 0)}`;

const num = (v: number | null) => (v === null ? '-' : String(Math.round(v)));

/** One row for each topology: summed and per-role CPU and memory. */
export function renderResourceTable(results: TopologyResult[]): string {
	const header = [
		'topology',
		'slots',
		'in flight',
		'turns/min',
		'total cpu %',
		'total mem MB',
		'main cpu %',
		'main mem MB',
		'main heap MB',
		'worker cpu %',
		'worker mem MB',
		'worker lag ms',
	];
	const rows = results.map((r) => {
		const res = r.resources;
		const byRole = (role: string) =>
			Object.values(res?.processes ?? {}).filter((p) => p.role === role);
		const peak = (list: ResourceStats[], key: keyof ResourceStats, q: 'p50' | 'max') =>
			list.length ? Math.max(...list.map((p) => p[key][q] ?? 0)) : null;
		const mains = byRole('main');
		const workers = byRole('worker');
		const pair = (a: number | null, b: number | null) => `${num(a)} / ${num(b)}`;
		return [
			r.topology,
			r.stack.slotsPerWorker ? `${r.stack.workers}x${r.stack.slotsPerWorker}` : '-',
			r.concurrency === undefined ? '-' : String(r.concurrency),
			r.turnsPerMinute.toFixed(1),
			res ? pair(res.total.cpu.p50, res.total.cpu.max) : '-',
			res ? pair(res.total.rssMb.p50, res.total.rssMb.max) : '-',
			pair(peak(mains, 'cpu', 'p50'), peak(mains, 'cpu', 'max')),
			pair(peak(mains, 'rssMb', 'p50'), peak(mains, 'rssMb', 'max')),
			pair(peak(mains, 'heapUsedMb', 'p50'), peak(mains, 'heapUsedMb', 'max')),
			pair(peak(workers, 'cpu', 'p50'), peak(workers, 'cpu', 'max')),
			pair(peak(workers, 'rssMb', 'p50'), peak(workers, 'rssMb', 'max')),
			pair(peak(workers, 'lagMs', 'p50'), peak(workers, 'lagMs', 'max')),
		];
	});
	const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
	const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
	return [
		line(header),
		widths.map((w) => '-'.repeat(w)).join('  '),
		...rows.map(line),
		'',
		'Cells are p50 / max while measuring. CPU is % of one core. Main and worker cells show the busiest process of that role. Heap is live JS objects; the rest of the memory is mostly not collected yet.',
	].join('\n');
}

/**
 * One line for each process with a limit: its peak against the limit. The
 * kernel enforces the CPU limit. A throttled process answers the scrape late,
 * so a sampled peak can read above the limit. The line then says `at cpu`.
 */
export function renderLimitCheck(results: TopologyResult[]): string {
	const lines: string[] = [];
	for (const r of results) {
		if (!r.limits) continue;
		lines.push(`Limits for ${r.topology}:`);
		for (const [name, p] of Object.entries(r.resources?.processes ?? {})) {
			const limit = r.limits[p.role === 'worker' ? 'worker' : 'main'];
			if (!limit) continue;
			const parts: string[] = [];
			let over = false;
			let atCpu = false;
			if (limit.memory) {
				const limitMb = limit.memory * 1024;
				const peak = p.rssMb.max ?? 0;
				over ||= peak > limitMb;
				parts.push(
					`memory peak ${Math.round(peak)} of ${Math.round(limitMb)} MB (${Math.round((peak / limitMb) * 100)}%)`,
				);
			}
			if (limit.cpu) {
				const limitPct = limit.cpu * 100;
				const peak = p.cpu.max ?? 0;
				atCpu = peak >= limitPct * 0.9;
				parts.push(
					`cpu peak ${Math.round(peak)}% of ${Math.round(limitPct)}%, p50 ${Math.round(p.cpu.p50 ?? 0)}%`,
				);
			}
			if (parts.length)
				lines.push(
					`  ${over ? 'OVER  ' : atCpu ? 'at cpu' : 'ok    '}  ${name}: ${parts.join(' · ')}`,
				);
		}
		lines.push(
			r.killed?.length
				? `  KILLED or restarted: ${r.killed.join(', ')}`
				: '  No container was killed for memory or restarted.',
		);
	}
	return lines.join('\n');
}

/** One row for each topology and turn kind. Cells show p50 / p95 in ms. */
export function renderTable(results: TopologyResult[]): string {
	const header = [
		'topology',
		'kind',
		'turns',
		'err',
		'503',
		'start',
		'1st token',
		'total',
		'db queued',
		'db run',
		'ran on',
		'turns/min',
	];
	const rows: string[][] = [];
	for (const result of results) {
		const groups: Array<[string, GroupSummary]> = [
			...Object.entries(result.byKind),
			['all', result.all],
		];
		for (const [kind, g] of groups) {
			rows.push([
				result.topology,
				kind,
				String(g.turns),
				String(g.errors),
				String(g.rejected ?? 0),
				ms(g.start),
				ms(g.firstToken),
				ms(g.total),
				ms(g.dbQueued),
				ms(g.dbRun),
				Object.entries(g.ranOn)
					.map(([where, n]) => `${where}:${n}`)
					.join(' '),
				kind === 'all' ? result.turnsPerMinute.toFixed(1) : '',
			]);
		}
	}
	const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
	const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
	return [
		line(header),
		widths.map((w) => '-'.repeat(w)).join('  '),
		...rows.map(line),
		'',
		'Times are p50 / p95 in ms, from the moment the message was sent.',
		'start = until execution-started (queue + dispatch). db queued/run come from agent_execution.',
	].join('\n');
}
