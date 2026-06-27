// Cross-process coordination sidecar for the eval-pool spike. Playwright workers
// are separate processes, so the allocator can't be shared in memory the way the
// CLI does — it lives here behind HTTP and workers poll /acquire + /release.
// Every acquire/release is recorded as an interval so global-teardown can prove,
// from real concurrent builds, that affinity / anti-collision / cap held.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { writeFileSync } from 'node:fs';

import { PoolAllocator, type PoolLane } from './lane-allocator';

interface Interval {
	id: number;
	key: string;
	url: string;
	tAcquire: number;
	tRelease?: number;
	builtUrl?: string;
	ok?: boolean;
	error?: string;
}

interface CollisionViolation {
	url: string;
	key: string;
	a: number;
	b: number;
}

interface Report {
	cap: number;
	laneCount: number;
	totalBuilds: number;
	okBuilds: number;
	incompleteIntervals: number;
	observedMaxConcurrencyGlobal: number;
	observedMaxConcurrencyPerLane: Record<string, number>;
	buildsPerLane: Record<string, number>;
	affinityViolations: Array<{ id: number; key: string; acquired: string; built: string }>;
	collisionViolations: CollisionViolation[];
	capViolations: Array<{ url: string; observedMax: number; cap: number }>;
	verdict: 'PASS' | 'FAIL';
	intervals: Interval[];
}

let teardownRef: { stop: () => Promise<void>; report: () => Report } | undefined;

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (c: Buffer) => chunks.push(c));
		req.on('end', () => {
			const raw = Buffer.concat(chunks).toString('utf8');
			try {
				resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
			} catch (e) {
				reject(e instanceof Error ? e : new Error(String(e)));
			}
		});
		req.on('error', reject);
	});
}

function json(res: ServerResponse, code: number, body: unknown): void {
	res.writeHead(code, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

function maxConcurrency(ivs: Interval[], now: number): number {
	const events: Array<[number, number]> = [];
	for (const iv of ivs) {
		events.push([iv.tAcquire, 1]);
		events.push([iv.tRelease ?? now, -1]);
	}
	// Releases sort before acquires at the same instant so a hand-off doesn't overcount.
	events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	let cur = 0;
	let max = 0;
	for (const [, delta] of events) {
		cur += delta;
		if (cur > max) max = cur;
	}
	return max;
}

export function startPoolServer(): Promise<{ port: number }> {
	const baseUrls = (process.env.EVAL_POOL_BASE_URLS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	if (baseUrls.length === 0) {
		throw new Error('EVAL_POOL_BASE_URLS is empty — set a comma-separated list of n8n base URLs');
	}
	const cap = Number.parseInt(process.env.EVAL_POOL_CAP ?? '4', 10);
	const port = Number.parseInt(process.env.EVAL_POOL_PORT ?? '47100', 10);

	const lanes: PoolLane[] = baseUrls.map((url) => ({
		url,
		activeBuilds: 0,
		inflightKeys: new Set(),
	}));
	const allocator = new PoolAllocator(lanes, cap);
	const intervals: Interval[] = [];
	let nextId = 1;

	const buildReport = (): Report => {
		const now = Date.now();
		const byLane = new Map<string, Interval[]>();
		for (const url of baseUrls) byLane.set(url, []);
		for (const iv of intervals) byLane.get(iv.url)?.push(iv);

		const collisionViolations: CollisionViolation[] = [];
		const capViolations: Array<{ url: string; observedMax: number; cap: number }> = [];
		const observedMaxConcurrencyPerLane: Record<string, number> = {};
		const buildsPerLane: Record<string, number> = {};

		for (const [url, ivs] of byLane) {
			buildsPerLane[url] = ivs.length;
			const laneMax = maxConcurrency(ivs, now);
			observedMaxConcurrencyPerLane[url] = laneMax;
			if (laneMax > cap) capViolations.push({ url, observedMax: laneMax, cap });
			for (let i = 0; i < ivs.length; i++) {
				for (let j = i + 1; j < ivs.length; j++) {
					if (ivs[i].key !== ivs[j].key) continue;
					const aEnd = ivs[i].tRelease ?? now;
					const bEnd = ivs[j].tRelease ?? now;
					if (ivs[i].tAcquire < bEnd && ivs[j].tAcquire < aEnd) {
						collisionViolations.push({ url, key: ivs[i].key, a: ivs[i].id, b: ivs[j].id });
					}
				}
			}
		}

		const affinityViolations = intervals
			.filter((iv) => iv.builtUrl !== undefined && iv.builtUrl !== iv.url)
			.map((iv) => ({ id: iv.id, key: iv.key, acquired: iv.url, built: iv.builtUrl ?? '' }));

		const incompleteIntervals = intervals.filter((iv) => iv.tRelease === undefined).length;
		const verdict: 'PASS' | 'FAIL' =
			intervals.length > 0 &&
			collisionViolations.length === 0 &&
			capViolations.length === 0 &&
			affinityViolations.length === 0
				? 'PASS'
				: 'FAIL';

		return {
			cap,
			laneCount: baseUrls.length,
			totalBuilds: intervals.length,
			okBuilds: intervals.filter((iv) => iv.ok === true).length,
			incompleteIntervals,
			observedMaxConcurrencyGlobal: maxConcurrency(intervals, now),
			observedMaxConcurrencyPerLane,
			buildsPerLane,
			affinityViolations,
			collisionViolations,
			capViolations,
			verdict,
			intervals,
		};
	};

	const server: Server = createServer((req, res) => {
		void (async () => {
			try {
				const url = req.url ?? '';
				if (req.method === 'GET' && url === '/health') return json(res, 200, { ok: true });
				if (req.method === 'GET' && url === '/report') return json(res, 200, buildReport());
				if (req.method === 'POST' && url === '/acquire') {
					const body = await readBody(req);
					const key = String(body.key ?? '');
					const lane = allocator.tryAcquire(key);
					if (!lane) return json(res, 200, { wait: true });
					const id = nextId++;
					intervals.push({ id, key, url: lane.url, tAcquire: Date.now() });
					return json(res, 200, { url: lane.url, id });
				}
				if (req.method === 'POST' && url === '/release') {
					const body = await readBody(req);
					const key = String(body.key ?? '');
					const laneUrl = String(body.url ?? '');
					const id = Number(body.id);
					allocator.release(laneUrl, key);
					const iv = intervals.find((x) => x.id === id);
					if (iv) {
						iv.tRelease = Date.now();
						iv.builtUrl = typeof body.builtUrl === 'string' ? body.builtUrl : undefined;
						iv.ok = body.ok === true;
						iv.error = typeof body.error === 'string' ? body.error : undefined;
					}
					return json(res, 200, { ok: true });
				}
				json(res, 404, { error: 'not found' });
			} catch (e) {
				json(res, 500, { error: e instanceof Error ? e.message : String(e) });
			}
		})();
	});

	return new Promise((resolve) => {
		server.listen(port, '127.0.0.1', () => {
			teardownRef = {
				stop: async () => await new Promise<void>((r) => server.close(() => r())),
				report: buildReport,
			};
			resolve({ port });
		});
	});
}

export async function stopPoolServer(outFile: string): Promise<Report> {
	if (!teardownRef) throw new Error('pool server not started');
	const report = teardownRef.report();
	writeFileSync(outFile, JSON.stringify(report, null, 2));
	await teardownRef.stop();
	return report;
}
