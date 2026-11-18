// Crash test driver for the log offload (bench/logoff-crash-test.sh).
// Usage: node bench/logoff-crash/run.mjs <rounds>
//
// Each round:
//   1. Start wfrt serve with --admin-port, the webhook module, a fresh log dir.
//   2. Send concurrent requests with unique ids, record which replies arrive.
//   3. kill -9 at a random moment (seeded, the seed is printed).
//   4. Restart on the same log dir, read finished executions from the admin
//      event stream via curl.
//   5. Assert: every reply that arrived before the kill has a finished event
//      in the recovered log. No torn records. The shard serves new requests.
//
// Runs with --log-offload on first, then --log-offload off as control.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const wfrt = process.env.WFRT ?? join(root, 'zig-out', 'bin', 'wfrt');
const cli = join(root, '..', 'packages', '@n8n', 'workflow-lang', 'src', 'cli.ts');
const rounds = parseInt(process.argv[2] ?? '30', 10);
if (isNaN(rounds) || rounds < 1) {
  console.error('usage: node bench/logoff-crash/run.mjs <rounds>');
  process.exit(2);
}
const BASE_PORT = parseInt(process.env.BASE_PORT ?? '28750', 10);

const ADMIN_SECRET = 'test-secret-logoff-crash-test';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const children = new Set();

function start(name, cmd, args, env = {}) {
  const out = join(work, `${name}.log`);
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    if (await check()) return;
    await sleep(100);
  }
  throw new Error(`timed out waiting for ${what}`);
}

let failed = false;
function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failed = true;
}

// ---- workflow module -----------------------------------------------------------

const work = mkdtempSync(join(tmpdir(), 'wfrt-logoff-'));
const moduleDir = join(work, 'module');
mkdirSync(moduleDir, { recursive: true });

// A minimal webhook workflow with 'full' durability (sync tier).
writeFileSync(join(work, 'echo.ts'),
  `import { webhook, workflow } from '@n8n/workflow-lang';\n` +
  `export default workflow({\n` +
  `  triggers: [webhook<{ id: string }>({ path: 'echo', method: 'POST' })],\n` +
  `  durability: 'full',\n` +
  `  async run(ctx, trigger) {\n` +
  `    await ctx.respond({ name: 'Echo', status: 200, body: { echo: trigger.body.id } });\n` +
  `    return { echoed: trigger.body.id };\n` +
  `  },\n` +
  `});\n`
);
execFileSync(process.execPath, [cli, 'compile', join(work, 'echo.ts'), '-o', moduleDir], { stdio: 'ignore' });
const modulePath = join(moduleDir, 'echo.wfm');

// ---- helpers -------------------------------------------------------------------

async function call(port, id, timeoutMs = 5_000) {
  const started = Date.now();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.text();
    return { id, status: res.status, body, ms: Date.now() - started };
  } catch (error) {
    return { id, status: 0, body: String(error), ms: Date.now() - started };
  }
}

function isHealthyReply(r) {
  return r.status === 200 && r.body.includes('"echo"');
}

// Use curl to read the admin event stream. The stream is persistent; we
// capture events sent during a short window.
function readEventStream(adminPort) {
  try {
    const out = execFileSync('curl', [
      '-s', '-m', '2',
      '-H', `authorization: Bearer ${ADMIN_SECRET}`,
      `http://127.0.0.1:${adminPort}/_admin/events`,
    ], { encoding: 'utf8', timeout: 5_000, stdio: ['ignore', 'pipe', 'pipe'] });
    return out;
  } catch (error) {
    // curl exits with code 28 on timeout, which is expected.
    const stderr = error.stderr || '';
    const stdout = error.stdout || '';
    if (error.status === 28 || error.code === 28) return stdout;
    return stdout + stderr;
  }
}

// Parse finished events from the event stream. Each line is a JSON object.
// Extract echoed IDs from the result field: {"echoed":"<our-id>"}
function parseFinishedIds(eventText) {
  const ids = new Set();
  for (const line of eventText.split('\n')) {
    if (!line.startsWith('{')) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.type === 'finished' && ev.result && ev.result.echoed) {
        ids.add(String(ev.result.echoed));
      }
    } catch (_) { /* skip partial lines */ }
  }
  return ids;
}

// ---- run rounds ----------------------------------------------------------------

async function runRounds(label, logOffload) {
  let totalKills = 0;
  let totalReplies = 0;
  let totalChecked = 0;
  let defects = 0;
  const downLogs = [];

  const seedBase = Date.now();
  console.log(`\n=== ${label} (${rounds} rounds, --log-offload ${logOffload}) ===`);

  for (let r = 0; r < rounds; r++) {
    const roundSeed = seedBase + r * 9973;
    const logDir = join(work, `${label.replace(/\s+/g, '-')}-${r}`);
    try { rmSync(logDir, { recursive: true, force: true }); } catch (_) {}
    mkdirSync(logDir, { recursive: true });

    const port = BASE_PORT + (r % 100);
    const adminPort = port + 1000;

    // Start the first process.
    const serve = start(`serve-${r}`, wfrt, [
      'serve',
      '--port', String(port),
      '--log-dir', logDir,
      '--log-offload', logOffload,
      '--admin-port', String(adminPort),
      '--admin-secret-env', 'WF_ADMIN_SECRET',
      '--module', modulePath,
      '--route', 'POST /echo',
    ], { WF_ADMIN_SECRET: ADMIN_SECRET });

    await waitFor(async () => {
      try { return (await call(port, 'probe')).status === 200; }
      catch (_) { return false; }
    }, `wfrt ready (round ${r})`, 30_000);

    // Send concurrent requests.
    const connCount = 4;
    const idsPerConn = 20; // More requests = more chance of catching in-flight
    const allIds = [];
    for (let c = 0; c < connCount; c++) {
      for (let i = 0; i < idsPerConn; i++) {
        allIds.push(`r${r}-c${c}-i${i}`);
      }
    }

    const replies = new Map();
    allIds.forEach(id => replies.set(id, false));

    const seed = roundSeed;
    // Kill between 20ms and 120ms after starting requests.
    // With 80 pipelined requests on 4 connections, many will be in flight.
    const killDelay = 20 + (seed % 101);
    console.log(`round ${r}: seed=${seed} kill-after=${killDelay}ms`);

    // Start all requests in parallel.
    const requestPromises = allIds.map(id => call(port, id, 2_000));

    // Schedule the kill.
    const killTimer = setTimeout(() => {
      try { serve.kill('SIGKILL'); } catch (_) {}
    }, killDelay);

    const settled = await Promise.allSettled(requestPromises);
    clearTimeout(killTimer);
    // Make sure the process is dead.
    try { serve.kill('SIGKILL'); } catch (_) {}
    await sleep(300);

    for (const rv of settled) {
      if (rv.status === 'fulfilled' && isHealthyReply(rv.value)) {
        replies.set(rv.value.id, true);
        totalReplies++;
      }
    }

    const arrivedIds = new Set();
    for (const [id, arrived] of replies) {
      if (arrived) arrivedIds.add(id);
    }
    totalChecked += arrivedIds.size;
    totalKills++;

    // Restart on the same log dir.
    const serve2 = start(`serve-${r}-rec`, wfrt, [
      'serve',
      '--port', String(port),
      '--log-dir', logDir,
      '--log-offload', logOffload,
      '--admin-port', String(adminPort),
      '--admin-secret-env', 'WF_ADMIN_SECRET',
      '--module', modulePath,
      '--route', 'POST /echo',
    ], { WF_ADMIN_SECRET: ADMIN_SECRET });

    await waitFor(async () => {
      try { return (await call(port, 'post-recover')).status === 200; }
      catch (_) { return false; }
    }, `wfrt recover ready (round ${r})`, 30_000);

    // Read the event stream via curl: the recovered outbox replays stored
    // events first, so they appear at once on connection.
    const eventText = readEventStream(adminPort);
    const finishedIds = parseFinishedIds(eventText);

    // Read the recovery log from stderr.
    const logText = serve2.log();
    const recoveredMatch = logText.match(/recovered (\d+) batches, (\d+) live, (\d+) parked/);
    const recoveredBatches = recoveredMatch ? parseInt(recoveredMatch[1], 10) : -1;
    const recoveredLive = recoveredMatch ? parseInt(recoveredMatch[2], 10) : -1;

    // The rule: every id whose reply arrived before the kill must have a
    // finished event in the recovered log (its echoed id matches).
    let missing = 0;
    for (const id of arrivedIds) {
      if (!finishedIds.has(id)) missing++;
    }

    let torn = false;
    // A torn record would show as valid_bytes < total bytes in the log.
    // The recovery drops a torn tail; the note is in the log.
    if (logText.includes('torn') || logText.includes('truncate')) torn = true;

    const ruleOk = missing === 0 && !torn;
    check(ruleOk,
      `round ${r}: seed=${seed} kill=${killDelay}ms arrived=${arrivedIds.size} finished=${finishedIds.size} missing=${missing} batches=${recoveredBatches} live=${recoveredLive} torn=${torn}`);
    if (!ruleOk) {
      defects++;
      console.log(`  arrived ids (first 10): ${[...arrivedIds].slice(0, 10).join(', ')}`);
      console.log(`  finished ids (first 10): ${[...finishedIds].slice(0, 10).join(', ')}`);
      downLogs.push({ r, logDir, serveLog: serve.log(), serve2Log: logText.slice(-2000) });
    }

    await stop(serve2);
    await sleep(100);
  }

  console.log(`\n${label}: ${totalKills} kills, ${totalReplies} replies, ${totalChecked} checked, ${defects} defects`);
  if (defects > 0) {
    for (const dl of downLogs.slice(0, 3)) {
      console.log(`\n--- defect round ${dl.r} serve last 800 chars ---\n${dl.serveLog.slice(-800)}`);
      console.log(`\n--- defect round ${dl.r} recover last 800 chars ---\n${dl.serve2Log.slice(-800)}`);
    }
  }
  return defects;
}

async function main() {
  console.log(`wfrt: ${wfrt}`);
  console.log(`module: ${modulePath}`);

  const defectsOn = await runRounds('log-offload on', 'on');
  const defectsOff = await runRounds('log-offload off', 'off');

  console.log(`\n=== summary ===`);
  console.log(`log-offload on:  ${defectsOn} defects`);
  console.log(`log-offload off: ${defectsOff} defects`);

  if (defectsOn > 0 || defectsOff > 0) failed = true;
}

try {
  await main();
} catch (error) {
  console.error(error);
  failed = true;
} finally {
  for (const c of children) {
    try { c.kill('SIGKILL'); } catch (_) {}
  }
  rmSync(work, { recursive: true, force: true });
}
console.log(failed ? 'logoff crash test FAILED' : 'logoff crash test passed');
process.exit(failed ? 1 : 0);