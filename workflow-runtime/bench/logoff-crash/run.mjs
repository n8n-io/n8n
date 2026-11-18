// Crash test driver for the log offload (bench/logoff-crash-test.sh).
// Usage: node bench/logoff-crash/run.mjs <rounds>
//
// Each round:
//   1. Start wfrt serve with a fresh log dir and the webhook module.
//   2. Several connections pipeline requests that never stop: each one keeps
//      sending a request with a new id as soon as one of its replies arrives,
//      so requests are in flight at any moment.
//   3. kill -9 at a random moment inside the window in which replies arrive.
//   4. Restart on the same log dir and read the recovered log (the admin
//      event stream replays the durable events of the outbox).
//   5. The rule: every request whose reply ARRIVED before the kill has a
//      finished record in the recovered log. A request with no reply may be
//      there or not.
//
// Half of the rounds run with WFRT_LOG_SYNC_DELAY_MS: the writer thread
// sleeps before each sync, so the window between "record queued" and
// "record durable" is wide on purpose. A reply that leaves before its sync
// would then show up as a defect at once.
//
// The run also fails when fewer than 80% of the rounds had requests in
// flight at the kill: such a run proves nothing.
//
// Runs with --log-offload on, then with --log-offload off as the control.
import { readdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const wfrt = process.env.WFRT ?? join(root, 'zig-out', 'bin', 'wfrt');
const rounds = parseInt(process.argv[2] ?? '20', 10);
if (isNaN(rounds) || rounds < 2) {
  console.error('usage: node bench/logoff-crash/run.mjs <rounds>  (at least 2)');
  process.exit(2);
}
const BASE_PORT = parseInt(process.env.BASE_PORT ?? '28750', 10);
const ADMIN_SECRET = 'test-secret-logoff-crash-test';
// The writer sleeps this long before each sync in the delayed rounds.
const SYNC_DELAY_MS = process.env.SYNC_DELAY_MS ?? '150';
// Requests a connection keeps in flight at once.
const WINDOW = 4;
const CONNS = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const children = new Set();
const work = mkdtempSync(join(tmpdir(), 'wfrt-logoff-'));

function start(name, args, env = {}) {
  const out = join(work, `${name}.log`);
  const child = spawn(wfrt, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  const chunks = [];
  child.stdout.on('data', (d) => chunks.push(d));
  child.stderr.on('data', (d) => chunks.push(d));
  child.on('exit', () => { try { writeFileSync(out, Buffer.concat(chunks)); } catch (_) {} });
  child.log = () => Buffer.concat(chunks).toString('utf8');
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const done = new Promise((r) => child.once('exit', r));
  child.kill('SIGTERM');
  await done;
}

async function waitFor(check, what, ms = 30_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await sleep(50);
  }
  throw new Error(`timed out waiting for ${what}`);
}

let failed = false;
function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failed = true;
}

// ---- the workflow module -------------------------------------------------------

// A webhook program with the sync durability tier, built by the runtime's own
// assembler (the compiler cannot express this tier: it writes `full`/`steps`,
// and the runtime reads `sync`/`batched`/`none`). The reply is `{id, ok}`.
const modulePath = join(work, 'w2.wfm');
execFileSync(wfrt, ['asm', 'w2', modulePath, 'sync'], { stdio: 'ignore' });

// ---- a pipelining HTTP/1.1 client ----------------------------------------------

/// One connection. It keeps `WINDOW` requests in flight until `stop()`.
/// `sent` and `arrived` are the ids that the connection wrote and answered.
class Pipeline {
  constructor(port, prefix) {
    this.port = port;
    this.prefix = prefix;
    this.sent = [];
    this.arrived = new Set();
    this.next = 0;
    this.buf = Buffer.alloc(0);
    this.closed = false;
    this.sock = net.connect(port, '127.0.0.1');
    this.sock.setNoDelay(true);
    this.sock.on('data', (d) => this.onData(d));
    this.sock.on('error', () => { this.closed = true; });
    this.sock.on('close', () => { this.closed = true; });
    this.sock.on('connect', () => this.fill());
    this.sock.on('drain', () => this.fill());
  }

  id() {
    return `${this.prefix}q${this.next++}`;
  }

  request(id) {
    const body = JSON.stringify({ id });
    return `POST /echo HTTP/1.1\r\nhost: 127.0.0.1\r\ncontent-type: application/json\r\ncontent-length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
  }

  fill() {
    // Only write when nothing waits in the socket buffer: the load is what
    // the shard sees, not what this process queued.
    while (!this.closed && this.sock.writableLength === 0 && this.sent.length - this.arrived.size < WINDOW) {
      const id = this.id();
      this.sent.push(id);
      this.sock.write(this.request(id));
    }
  }

  onData(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      const headEnd = this.buf.indexOf('\r\n\r\n');
      if (headEnd < 0) return;
      const head = this.buf.subarray(0, headEnd).toString('latin1');
      const len = /content-length:\s*(\d+)/i.exec(head);
      if (!len) { this.buf = Buffer.alloc(0); return; }
      const start = headEnd + 4;
      const total = start + Number(len[1]);
      if (this.buf.length < total) return;
      const body = this.buf.subarray(start, total).toString('utf8');
      this.buf = this.buf.subarray(total);
      try {
        const echoed = JSON.parse(body).id;
        if (typeof echoed === 'string') this.arrived.add(echoed);
      } catch (_) { /* not our reply */ }
      this.fill();
    }
  }

  stop() {
    this.closed = true;
    try { this.sock.destroy(); } catch (_) {}
  }

  inFlight() {
    return this.sent.length - this.arrived.size;
  }
}

// ---- the recovered log ---------------------------------------------------------

/// The finished ids in the durable log of the log dir: the outbox segments
/// hold one record for each durable event (a 16-byte header, then the JSON
/// line). The shard publishes a `finished` event only when it performs the
/// action, and a held action is performed only after its log record is
/// synced. So a `finished` record here proves the record was durable.
function readFinishedIds(logDir, prefix) {
  const ids = new Set();
  let files = [];
  try {
    files = readdirSync(logDir).filter((f) => /^outbox-\d+-\d+\.seg$/.test(f));
  } catch (_) {
    return ids;
  }
  // Oldest segment first: the record of each event is in the segment of its seq.
  files.sort((a, b) => Number(a.split('-')[2]) - Number(b.split('-')[2]));
  for (const f of files) {
    let buf;
    try { buf = readFileSync(`${logDir}/${f}`); } catch (_) { continue; }
    let off = 0;
    while (off + 16 <= buf.length) {
      const len = buf.readUInt32LE(off + 8);
      if (off + 16 + len > buf.length) break; // a torn last record
      const line = buf.subarray(off + 16, off + 16 + len).toString('utf8');
      off += 16 + len;
      if (!line.includes('"finished"')) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.type !== 'finished' || !ev.result) continue;
        const echoed = ev.result.id;
        if (typeof echoed === 'string' && echoed.startsWith(prefix)) ids.add(echoed);
      } catch (_) { /* not a line we count */ }
    }
  }
  return ids;
}

function serveArgs(port, adminPort, logDir, offload) {
  return [
    'serve',
    '--port', String(port),
    '--log-dir', logDir,
    '--log-offload', offload,
    '--admin-port', String(adminPort),
    '--admin-secret-env', 'WF_ADMIN_SECRET',
    '--module', modulePath,
    '--route', 'POST /echo',
  ];
}

// ---- one round ----------------------------------------------------------------

async function oneRound(r, offload) {
  const delay = r % 2 === 0;
  const logDir = join(work, `log-${offload}-${r}`);
  try { rmSync(logDir, { recursive: true, force: true }); } catch (_) {}
  mkdirSync(logDir, { recursive: true });
  const port = BASE_PORT + (r % 200);
  const adminPort = port + 1000;
  const prefix = `r${r}-`;
  const env = { WF_ADMIN_SECRET: ADMIN_SECRET };
  if (delay) env.WFRT_LOG_SYNC_DELAY_MS = String(SYNC_DELAY_MS);

  const serve = start(`serve-${offload}-${r}`, serveArgs(port, adminPort, logDir, offload), env);
  const up = await waitFor(async () => !serve.exitCode && (await probe(port)).ok, `wfrt ready (round ${r})`);
  if (!up) throw new Error(`wfrt did not start in round ${r}`);

  // Load that does not stop until the kill.
  const conns = Array.from({ length: CONNS }, () => new Pipeline(port, prefix));
  // A random moment inside the window in which replies are still arriving.
  const killAfter = 250 + Math.floor(Math.random() * 500);
  await sleep(killAfter);

  // Snapshot at the kill: requests written, replies that arrived, in flight.
  let sent = 0;
  let arrived = 0;
  for (const c of conns) { sent += c.sent.length; arrived += c.arrived.size; }
  const inFlight = sent - arrived;

  // Kill and keep reading until the sockets close: a reply written before
  // the kill still arrives, and it counts.
  try { serve.kill('SIGKILL'); } catch (_) {}
  await sleep(250);
  for (const c of conns) c.stop();
  const arrivedIds = new Set();
  for (const c of conns) for (const id of c.arrived) arrivedIds.add(id);
  await sleep(50);

  // Restart on the same log dir and read the recovered log.
  const serve2 = start(`serve2-${offload}-${r}`, serveArgs(port, adminPort, logDir, offload), env);
  await waitFor(async () => !serve2.exitCode && (await probe(port)).ok, `wfrt recovered (round ${r})`);
  const finished = readFinishedIds(logDir, prefix);
  const recoveryNote = /recovered (\d+) batches, (\d+) live, (\d+) parked/.exec(serve2.log());
  const batches = recoveryNote ? Number(recoveryNote[1]) : -1;
  await sleep(50);

  // The rule.
  const missing = [...arrivedIds].filter((id) => !finished.has(id));
  const noReply = [...finished].filter((id) => !arrivedIds.has(id));

  await stop(serve2);
  try { rmSync(logDir, { recursive: true, force: true }); } catch (_) {}

  return {
    r, delay, sent, arrived: arrivedIds.size, inFlight,
    finished: finished.size, missing: missing.length, noReply: noReply.length,
    batches, sample: missing.slice(0, 5),
  };
}

async function probe(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'probe' }),
      signal: AbortSignal.timeout(1_000),
    });
    const text = await res.text();
    return { ok: res.status === 200 && text.includes('"probe"') };
  } catch (_) {
    return { ok: false };
  }
}

// ---- the two modes ------------------------------------------------------------

async function runMode(label, offload) {
  console.log(`\n=== ${label} (${rounds} rounds, half with a ${SYNC_DELAY_MS} ms sync delay) ===`);
  const t = {
    rounds, roundsInFlight: 0, replies: 0, records: 0, recordsNoReply: 0, repliesNoRecord: 0, noReplyExamples: 0,
  };
  for (let r = 0; r < rounds; r++) {
    const o = await oneRound(r, offload);
    t.replies += o.arrived;
    t.records += o.finished;
    t.recordsNoReply += o.noReply;
    t.repliesNoRecord += o.missing;
    if (o.arrived > 0 && o.inFlight > 0) t.roundsInFlight++;
    const good = o.missing === 0;
    check(good,
      `round ${r}${o.delay ? ' +delay' : ''}: sent=${o.sent} arrived=${o.arrived} inFlight=${o.inFlight} ` +
      `records=${o.finished} noReply=${o.noReply} missing=${o.missing} batches=${o.batches}`);
    if (o.noReply > 0) t.noReplyExamples++;
    if (!good) console.log(`  arrived with no record: ${o.sample.join(', ')}`);
  }

  const frac = t.roundsInFlight / t.rounds;
  console.log(`\ntotals (${label}):`);
  console.log(`  rounds with requests in flight at the kill: ${t.roundsInFlight}/${t.rounds} (${(frac * 100).toFixed(0)}%)`);
  console.log(`  replies that arrived:                      ${t.replies}`);
  console.log(`  records in the recovered log:              ${t.records}`);
  console.log(`  records whose reply did not arrive:        ${t.recordsNoReply} (allowed)`);
  console.log(`  replies that arrived with no record:       ${t.repliesNoRecord} (a defect)`);

  check(frac >= 0.8, `the load proved something: ${t.roundsInFlight}/${t.rounds} rounds had requests in flight (need 80%)`);
  check(t.repliesNoRecord === 0, `no reply left the process before its record was durable`);
  return t.repliesNoRecord;
}

async function main() {
  console.log(`wfrt: ${wfrt}`);
  const on = await runMode('log-offload on', 'on');
  const off = await runMode('log-offload off', 'off');
  console.log(`\n=== summary ===`);
  console.log(`log-offload on:  ${on} replies with no record`);
  console.log(`log-offload off: ${off} replies with no record`);
  if (on > 0 || off > 0) failed = true;
}

try {
  await main();
} catch (error) {
  console.error(error);
  failed = true;
} finally {
  for (const c of children) { try { c.kill('SIGKILL'); } catch (_) {} }
  rmSync(work, { recursive: true, force: true });
}
console.log(failed ? 'logoff crash test FAILED' : 'logoff crash test passed');
process.exit(failed ? 1 : 0);
