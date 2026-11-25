// T-6 (CAP-797): benchmark of the two fence designs in ADR-43 on Postgres.
// Throwaway branch only. Usage:
//   node scripts/fence-benchmark/bench.mjs [load|freeze|all] [--image postgres:17] [--seconds 15]
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const require = createRequire(new URL('../../packages/cli/package.json', import.meta.url));
const pg = require('pg');

const args = process.argv.slice(2);
const opt = (name, def) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? def : args[i + 1];
};
const mode = args[0] && !args[0].startsWith('--') ? args[0] : 'all';
const IMAGE = opt('image', 'postgres:17');
const SECONDS = Number(opt('seconds', 15));
const WARMUP_MS = 2000;
const ROUNDS = Number(opt('rounds', 40));
const OUT = opt('out', `fence-results-${IMAGE.replace(/\W/g, '-')}.json`);
const KIND = 'bench';
const PAYLOAD = 'x'.repeat(1024); // stands in for execution data

// ---------- database ----------

function startDb() {
	const id = execFileSync('docker', [
		'run', '-d', '--rm', '-e', 'POSTGRES_PASSWORD=bench', '-p', '127.0.0.1::5432',
		IMAGE, '-c', 'max_connections=400', '-c', 'track_commit_timestamp=on',
		'-c', 'shared_buffers=256MB',
	]).toString().trim();
	const port = execFileSync('docker', ['port', id, '5432']).toString().trim().split(':').pop();
	return { id, port: Number(port) };
}

async function waitReady(cfg) {
	for (let i = 0; i < 120; i++) {
		const c = new pg.Client(cfg);
		try {
			await c.connect();
			await c.query('SELECT 1');
			await c.end();
			return;
		} catch {
			await c.end().catch(() => {});
			await sleep(500);
		}
	}
	throw new Error('Postgres did not start');
}

const SCHEMA = `
CREATE TABLE lease_kind (
  "kind" VARCHAR(24) PRIMARY KEY,
  "fencingTokenCounter" BIGINT NOT NULL DEFAULT 0 CHECK ("fencingTokenCounter" >= 0),
  "syncLockRoundId" VARCHAR(36), "syncLockExpiresAt" TIMESTAMPTZ(3), "lastFullSyncAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE TABLE lease_session (
  "id" VARCHAR(36) PRIMARY KEY,
  "leaseKind" VARCHAR(24) NOT NULL REFERENCES lease_kind ("kind") ON DELETE CASCADE,
  "hostId" VARCHAR(255) NOT NULL, "bootId" VARCHAR(36) NOT NULL,
  "leaseDurationSeconds" INTEGER NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX ON lease_session ("leaseKind", "expiresAt");
CREATE TABLE lease (
  "leaseKind" VARCHAR(24) NOT NULL REFERENCES lease_kind ("kind") ON DELETE CASCADE,
  "key" VARCHAR(255) NOT NULL, "data" JSON NOT NULL, "dataHash" VARCHAR(64) NOT NULL,
  "leaseSessionId" VARCHAR(36), "fencingToken" BIGINT NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMPTZ(3), "readyAt" TIMESTAMPTZ(3), "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  PRIMARY KEY ("leaseKind", "key")
) WITH (fillfactor = 90);
CREATE INDEX ON lease ("leaseKind", "leaseSessionId");
-- stands in for execution_entity: what the fenced write creates
CREATE TABLE execution (
  "id" BIGSERIAL PRIMARY KEY, "leaseKey" VARCHAR(255) NOT NULL, "fencingToken" BIGINT NOT NULL,
  "sessionId" VARCHAR(36) NOT NULL, "payload" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ON execution ("leaseKey");
CREATE TABLE claim_log (
  "fencingToken" BIGINT PRIMARY KEY, "leaseKey" VARCHAR(255) NOT NULL, "xid" XID8 NOT NULL
);`;

async function reset(admin, nLeases) {
	await admin.query('TRUNCATE execution, claim_log, lease, lease_session, lease_kind RESTART IDENTITY CASCADE');
	await admin.query(`INSERT INTO lease_kind ("kind", "fencingTokenCounter") VALUES ($1, $2)`, [KIND, nLeases]);
	const session = randomUUID();
	await admin.query(
		`INSERT INTO lease_session ("id","leaseKind","hostId","bootId","leaseDurationSeconds","expiresAt")
		 VALUES ($1,$2,'host-a',$3,20, now() + interval '1 hour')`,
		[session, KIND, randomUUID()],
	);
	await admin.query(
		`INSERT INTO lease ("leaseKind","key","data","dataHash","leaseSessionId","fencingToken","claimedAt","readyAt")
		 SELECT $1, 'k' || g, '{}', 'h', $2, g + 1, now(), now() FROM generate_series(0, $3 - 1) g`,
		[KIND, session, nLeases],
	);
	await admin.query('VACUUM ANALYZE');
	const leases = Array.from({ length: nLeases }, (_, i) => ({ key: `k${i}`, token: i + 1, session }));
	return leases;
}

// ---------- the two fences ----------

let serverVersion = 0;

async function setBound(c, ms) {
	if (serverVersion >= 170000) {
		await c.query(`SET LOCAL transaction_timeout = '${ms}ms'`);
	} else {
		await c.query(`SET LOCAL statement_timeout = '${ms}ms'`);
		await c.query(`SET LOCAL idle_in_transaction_session_timeout = '${ms}ms'`);
	}
}

const INSERT_EXEC = `INSERT INTO execution ("leaseKey","fencingToken","sessionId","payload") VALUES ($1,$2,$3,$4)`;

// (a) ADR-4 + ADR-43(a): row lock, then session check by clock_timestamp(), then the write.
async function writeLocking(c, lease, { boundMs = 15000, freezeMs = 0 } = {}) {
	await c.query('BEGIN ISOLATION LEVEL READ COMMITTED');
	try {
		await setBound(c, boundMs);
		const held = await c.query(
			`SELECT 1 FROM lease WHERE "leaseKind"=$1 AND "key"=$2 AND "leaseSessionId"=$3
			 AND "fencingToken"=$4 AND "revokedAt" IS NULL FOR KEY SHARE`,
			[KIND, lease.key, lease.session, lease.token],
		);
		const alive =
			held.rowCount === 1 &&
			(await c.query(`SELECT 1 FROM lease_session WHERE "id"=$1 AND "expiresAt" > clock_timestamp()`, [lease.session]))
				.rowCount === 1;
		if (!alive) {
			await c.query('ROLLBACK');
			return 'refused';
		}
		await c.query(INSERT_EXEC, [lease.key, lease.token, lease.session, PAYLOAD]);
		if (freezeMs) await sleep(freezeMs);
		await c.query('COMMIT');
		return 'ok';
	} catch (e) {
		await c.query('ROLLBACK').catch(() => {});
		throw e;
	}
}

// (b) ADR-43(b): the check is part of the insert; no lock on the lease row.
async function writeNonLocking(c, lease, { freezeMs = 0 } = {}) {
	await c.query('BEGIN ISOLATION LEVEL READ COMMITTED');
	try {
		const r = await c.query(
			`INSERT INTO execution ("leaseKey","fencingToken","sessionId","payload")
			 SELECT $2::varchar, $4::bigint, $3::varchar, $5::text WHERE EXISTS (
			   SELECT 1 FROM lease l JOIN lease_session s ON s."id" = l."leaseSessionId"
			   WHERE l."leaseKind"=$1 AND l."key"=$2 AND l."leaseSessionId"=$3 AND l."fencingToken"=$4
			     AND l."revokedAt" IS NULL AND s."expiresAt" > clock_timestamp())`,
			[KIND, lease.key, lease.session, lease.token, PAYLOAD],
		);
		if (r.rowCount === 0) {
			await c.query('ROLLBACK');
			return 'refused';
		}
		if (freezeMs) await sleep(freezeMs);
		await c.query('COMMIT');
		return 'ok';
	} catch (e) {
		await c.query('ROLLBACK').catch(() => {});
		throw e;
	}
}

const FENCES = { a: writeLocking, b: writeNonLocking };

// ---------- load runs ----------

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

async function multixact(admin) {
	await admin.query('CHECKPOINT');
	const r = await admin.query('SELECT next_multixact_id::text::bigint AS id, next_multi_offset::text::bigint AS off FROM pg_control_checkpoint()');
	return { id: Number(r.rows[0].id), members: Number(r.rows[0].off) };
}

async function loadRun(cfg, admin, { fence, leases: nLeases, writers, pool: poolSize }) {
	const leases = await reset(admin, nLeases);
	const pool = new pg.Pool({ ...cfg, max: poolSize });
	const write = FENCES[fence];
	const lat = [];
	let ok = 0, refused = 0, errors = 0;
	let measuring = false, stop = false;

	// lock waits: sampled from pg_stat_activity every 50 ms
	const waits = { samples: 0, lockSum: 0, lockMax: 0, mxSamples: 0 };
	const sampler = (async () => {
		const s = new pg.Client(cfg);
		await s.connect();
		while (!stop) {
			const r = await s.query(
				`SELECT count(*) FILTER (WHERE wait_event_type = 'Lock') AS lock,
				        count(*) FILTER (WHERE wait_event ILIKE '%multixact%') AS mx
				 FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`,
			);
			if (measuring) {
				const lock = Number(r.rows[0].lock);
				waits.samples++;
				waits.lockSum += lock;
				waits.lockMax = Math.max(waits.lockMax, lock);
				if (Number(r.rows[0].mx) > 0) waits.mxSamples++;
			}
			await sleep(50);
		}
		await s.end();
	})();

	const workers = Array.from({ length: writers }, async (_, i) => {
		const lease = leases[i % nLeases];
		while (!stop) {
			const t0 = performance.now();
			const c = await pool.connect();
			try {
				const res = await write(c, lease);
				if (measuring) {
					lat.push(performance.now() - t0);
					res === 'ok' ? ok++ : refused++;
				}
			} catch (e) {
				if (measuring && errors++ === 0) console.error(`${fence}: ${e.message}`);
			} finally {
				c.release();
			}
		}
	});

	await sleep(WARMUP_MS);
	const mx0 = await multixact(admin);
	measuring = true;
	const t0 = performance.now();
	await sleep(SECONDS * 1000);
	measuring = false;
	const elapsed = (performance.now() - t0) / 1000;
	stop = true;
	await Promise.all(workers);
	await sampler;
	await pool.end();
	const mx1 = await multixact(admin);

	lat.sort((x, y) => x - y);
	return {
		fence, leases: nLeases, writers, pool: poolSize,
		writesPerSec: Math.round(ok / elapsed),
		p50ms: +(pct(lat, 50) ?? NaN).toFixed(2), p99ms: +(pct(lat, 99) ?? NaN).toFixed(2),
		refused, errors,
		lockWaitersAvg: +(waits.lockSum / waits.samples).toFixed(2), lockWaitersMax: waits.lockMax,
		multixactLwlockSamplesPct: +((100 * waits.mxSamples) / waits.samples).toFixed(1),
		multixactIds: mx1.id - mx0.id, multixactMembers: mx1.members - mx0.members,
	};
}

// ---------- freeze runs ----------
// One lease. The holder passes the fence, then freezes for a random time before COMMIT.
// Its session expires 1 s after the check. A claimer on another main polls every 50 ms
// and takes the lease as soon as the claim can see it free. A violation is a write with
// an older token that commits after a newer claim committed (guarantee 3).

async function claimOnce(c, newSession) {
	await c.query('BEGIN');
	try {
		const k = await c.query(`SELECT "fencingTokenCounter" FROM lease_kind WHERE "kind"=$1 FOR NO KEY UPDATE`, [KIND]);
		const row = await c.query(
			`SELECT l."key" FROM lease l
			 WHERE l."leaseKind"=$1 AND NOT EXISTS (
			   SELECT 1 FROM lease_session s WHERE s."id" = l."leaseSessionId" AND s."expiresAt" > clock_timestamp())
			 ORDER BY l."key" LIMIT 1 FOR UPDATE SKIP LOCKED`,
			[KIND],
		);
		if (row.rowCount === 0) {
			await c.query('ROLLBACK');
			return null;
		}
		const token = Number(k.rows[0].fencingTokenCounter) + 1;
		await c.query(
			`UPDATE lease SET "leaseSessionId"=$3, "fencingToken"=$4, "claimedAt"=now(), "readyAt"=NULL
			 WHERE "leaseKind"=$1 AND "key"=$2`,
			[KIND, row.rows[0].key, newSession, token],
		);
		await c.query(`UPDATE lease_kind SET "fencingTokenCounter"=$2 WHERE "kind"=$1`, [KIND, token]);
		await c.query(`INSERT INTO claim_log VALUES ($1,$2,pg_current_xact_id())`, [token, row.rows[0].key]);
		await c.query('COMMIT');
		return token;
	} catch (e) {
		await c.query('ROLLBACK').catch(() => {});
		throw e;
	}
}

async function freezeRun(cfg, admin, { fence, boundMs }) {
	const results = { fence, boundMs, rounds: ROUNDS, committed: 0, refused: 0, aborted: 0, straddled: 0, violations: 0, claimDelayMs: [] };
	const holder = new pg.Client(cfg);
	const claimer = new pg.Client(cfg);
	await holder.connect();
	await claimer.connect();
	holder.on('error', () => {});

	for (let r = 0; r < ROUNDS; r++) {
		const [lease] = await reset(admin, 1);
		// a fresh holder connection each round: transaction_timeout ends the session on PG17
		const h = new pg.Client(cfg);
		await h.connect();
		h.on('error', () => {});
		const newSession = randomUUID();
		await admin.query(
			`INSERT INTO lease_session ("id","leaseKind","hostId","bootId","leaseDurationSeconds","expiresAt")
			 VALUES ($1,$2,'host-b',$3,20, now() + interval '1 hour')`,
			[newSession, KIND, randomUUID()],
		);
		// the old session expires 1 s from now; the freeze is 0 to 2 s, so about half straddle it
		await admin.query(`UPDATE lease_session SET "expiresAt" = clock_timestamp() + interval '1 second' WHERE "id"=$1`, [lease.session]);
		const expiresAt = performance.now() + 1000;
		const freezeMs = Math.round(Math.random() * 2000);

		const holderDone = FENCES[fence](h, lease, { freezeMs, boundMs })
			.then((x) => (x === 'ok' ? results.committed++ : results.refused++))
			.catch(() => results.aborted++);

		let claimedAt = null;
		const deadline = performance.now() + 5000;
		while (performance.now() < deadline) {
			if ((await claimOnce(claimer, newSession)) !== null) {
				claimedAt = performance.now();
				break;
			}
			await sleep(50);
		}
		await holderDone;
		await h.end().catch(() => {});
		if (claimedAt !== null) results.claimDelayMs.push(Math.round(claimedAt - expiresAt));
		if (freezeMs > 1000) results.straddled++;

		const v = await admin.query(
			`SELECT count(*)::int AS n FROM execution e, claim_log c
			 WHERE e."leaseKey" = c."leaseKey" AND e."fencingToken" < c."fencingToken"
			   AND pg_xact_commit_timestamp(e.xmin) > pg_xact_commit_timestamp(c."xid"::xid)`,
		);
		results.violations += v.rows[0].n;
	}
	await holder.end();
	await claimer.end();
	const d = results.claimDelayMs.sort((x, y) => x - y);
	results.claimDelayP50ms = pct(d, 50);
	results.claimDelayMaxMs = d.at(-1);
	delete results.claimDelayMs;
	return results;
}

// ---------- main ----------

const { id, port } = startDb();
const cfg = { host: '127.0.0.1', port, user: 'postgres', password: 'bench', database: 'postgres' };
const out = { image: IMAGE, seconds: SECONDS, load: [], freeze: [] };
try {
	await waitReady(cfg);
	const admin = new pg.Client(cfg);
	await admin.connect();
	serverVersion = Number((await admin.query('SHOW server_version_num')).rows[0].server_version_num);
	await admin.query(SCHEMA);
	console.log(`${IMAGE} (server_version_num ${serverVersion}) on port ${port}`);

	if (mode === 'load' || mode === 'all') {
		const matrix = [];
		for (const fence of ['a', 'b']) {
			for (const writers of [50, 100]) for (const pool of [2, 10]) matrix.push({ fence, leases: 1, writers, pool });
			for (const pool of [2, 10]) matrix.push({ fence, leases: 300, writers: 300, pool });
		}
		for (const m of matrix) {
			const r = await loadRun(cfg, admin, m);
			out.load.push(r);
			console.log(JSON.stringify(r));
		}
	}
	if (mode === 'freeze' || mode === 'all') {
		for (const m of [{ fence: 'a', boundMs: 15000 }, { fence: 'a', boundMs: 1000 }, { fence: 'b', boundMs: 0 }]) {
			const r = await freezeRun(cfg, admin, m);
			out.freeze.push(r);
			console.log(JSON.stringify(r));
		}
	}
	await admin.end();
	writeFileSync(new URL(OUT, import.meta.url), JSON.stringify(out, null, 2));
} finally {
	execFileSync('docker', ['rm', '-f', id]);
}
