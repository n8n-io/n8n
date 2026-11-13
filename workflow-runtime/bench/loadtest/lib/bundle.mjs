// Bundles of the engine test bed, the gym admin client, and small helpers.
// The bundle format is the one of `engine-test/harness/lib.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';

export const GYM = process.env.GYM_ADMIN || 'http://127.0.0.1:47090';
const GYM_TOKEN = process.env.GYM_TOKEN || 'harness';

// The engine test harness of the bundles. When it is present, every tenant
// restore uses its `readBundle` and `restoreBytes`, so the clock rebase is
// the harness's own and cannot drift from it.
const HARNESS = path.join(process.env.ENGINE_TEST_DIR || path.join(process.env.HOME ?? '', 'wfrt-loadtest', 'data', 'engine-test'), 'harness', 'lib.mjs');
const harness = fs.existsSync(HARNESS) ? await import(pathToFileURL(HARNESS).href) : null;

export function readBundle(dir) {
	const j = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
	const gz = path.join(dir, 'snapshot.json.gz');
	const raw = () => (fs.existsSync(gz) ? zlib.gunzipSync(fs.readFileSync(gz)) : fs.readFileSync(path.join(dir, 'snapshot.json')));
	return {
		dir,
		meta: j('bundle.json'),
		workflow: j('workflow.json'),
		credentials: j('credentials.json'),
		resources: j('resources.json'),
		run: j('run.json'),
		expected: fs.existsSync(path.join(dir, 'expected.json')) ? j('expected.json') : null,
		snapshot: () => (harness ? harness.restoreBytes(harness.readBundle(dir)) : restoreBytes(j('bundle.json'), raw())),
	};
}

/**
 * The parsed snapshot of a bundle and the tenant time it was taken at, for
 * a run that changes the snapshot before it restores it (lib/vary.mjs).
 * Restore the result with `rebasedBytes`.
 */
export function snapshotBase(dir) {
	if (harness) {
		const b = harness.readBundle(dir);
		return { doc: JSON.parse(b.snapshot.toString('utf8')), clockAt: b.clockAt };
	}
	const meta = JSON.parse(fs.readFileSync(path.join(dir, 'bundle.json'), 'utf8'));
	const gz = path.join(dir, 'snapshot.json.gz');
	const doc = JSON.parse((fs.existsSync(gz) ? zlib.gunzipSync(fs.readFileSync(gz)) : fs.readFileSync(path.join(dir, 'snapshot.json'))).toString('utf8'));
	const clockAt = meta.clock_at ?? (meta.prepared_at ? new Date(Date.parse(meta.prepared_at) + (doc.clock?.offset_ms ?? 0)).toISOString() : null);
	return { doc, clockAt };
}

/** The bytes to restore for a (changed) snapshot: the clock rebase of harness/lib.mjs `restoreBytes`. */
export function rebasedBytes(doc, clockAt) {
	const snapshot = Buffer.from(JSON.stringify(doc));
	if (harness) return harness.restoreBytes({ clockAt, snapshot });
	if (!clockAt) return snapshot;
	return Buffer.from(JSON.stringify({ ...doc, clock: { ...(doc.clock ?? {}), offset_ms: Date.parse(clockAt) - Date.now() } }));
}

/**
 * The fallback when the harness is missing: the snapshot to restore, with
 * the tenant clock rebased to the moment the snapshot was taken, as
 * harness/lib.mjs `restoreBytes` does. A snapshot keeps its clock as an
 * offset from wall time, so a restore hours later would fire timeline events
 * that the reference run never saw. The capture moment is bundle.json
 * `clock_at`, or `prepared_at` plus the stored offset.
 */
function restoreBytes(meta, bytes) {
	const doc = JSON.parse(bytes.toString('utf8'));
	const offset = doc.clock?.offset_ms ?? 0;
	const clockAt = meta.clock_at ?? (meta.prepared_at ? new Date(Date.parse(meta.prepared_at) + offset).toISOString() : null);
	if (!clockAt) return bytes;
	doc.clock = { ...(doc.clock ?? {}), offset_ms: Date.parse(clockAt) - Date.now() };
	return Buffer.from(JSON.stringify(doc));
}

/** Every bundle directory (one with expected.json) under the roots, sorted by path. */
export function bundleDirs(roots) {
	const out = [];
	const walk = (d) => {
		if (fs.existsSync(path.join(d, 'expected.json'))) return void out.push(d);
		for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory() || e.isSymbolicLink()) walk(path.join(d, e.name));
	};
	for (const r of roots) walk(r);
	return out.sort();
}

export async function gym(op, body) {
	const r = await fetch(`${GYM}/_gym/v1/ops/${op}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${GYM_TOKEN}`, 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const text = await r.text();
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		json = { raw: text };
	}
	return { ok: r.ok, status: r.status, body: json };
}

/**
 * Restores a tenant snapshot. The load test's own gym can hold another
 * tenant with the same token host (a 409 "already belongs to tenant X").
 * Then this deletes tenant X (`delete_tenant`), logs it, and restores again,
 * so the restore starts clean. Use it only with the VM gym of the load test.
 */
export async function snapshotPut(tenant, bytes, retries = 3) {
	const r = await fetch(`${GYM}/_gym/v1/tenants/${encodeURIComponent(tenant)}/snapshot`, {
		method: 'PUT',
		headers: { authorization: `Bearer ${GYM_TOKEN}`, 'content-type': 'application/json' },
		body: bytes,
	});
	if (r.ok) return;
	const text = await r.text();
	const other = r.status === 409 ? /already belongs to tenant ([A-Za-z0-9_.:-]+)/.exec(text)?.[1] : undefined;
	if (other && other !== tenant && retries > 0) {
		const d = await gym('delete_tenant', { tenant: other });
		console.error(`restore ${tenant}: deleted tenant ${other}, which held the same token host (delete_tenant HTTP ${d.status})`);
		return await snapshotPut(tenant, bytes, retries - 1);
	}
	throw new Error(`snapshot import ${tenant}: HTTP ${r.status} ${text.slice(0, 200)}`);
}

/** Every vendor host name the gym serves, plus the database names. */
export async function gymHosts() {
	const r = await gym('list_services', {});
	const out = new Set(['postgres.sim', 'mysql.sim']);
	for (const s of r.body.services ?? []) for (const h of s.hosts ?? []) out.add(h);
	return [...out];
}

export function unflatten(data) {
	if (typeof data !== 'string' && !Array.isArray(data)) return data;
	const a = typeof data === 'string' ? JSON.parse(data) : data;
	if (!Array.isArray(a)) return a;
	const done = new Map();
	const rev = (i) => {
		const v = a[i];
		if (typeof v !== 'object' || v === null) return v;
		if (done.has(i)) return done.get(i);
		const out = Array.isArray(v) ? [] : {};
		done.set(i, out);
		for (const k of Object.keys(v)) out[k] = typeof v[k] === 'string' ? rev(Number(v[k])) : v[k];
		return out;
	};
	return rev(0);
}

/** Runs `fn` over `list` with `conc` in flight. */
export async function pool(list, conc, fn) {
	let next = 0;
	const out = new Array(list.length);
	await Promise.all(
		Array.from({ length: Math.min(conc, list.length) }, async () => {
			while (next < list.length) {
				const i = next++;
				out[i] = await fn(list[i], i);
			}
		}),
	);
	return out;
}

/** A seeded PRNG (mulberry32). */
export function rng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function readJsonl(file) {
	return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
