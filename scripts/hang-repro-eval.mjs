#!/usr/bin/env node
// Boot a single n8n process and hammer expression evaluation in a loop.
// Each evaluation triggers a fresh IsolatedVmBridge.initialize() via the pool's
// replenish path, so we repeatedly exercise the full init sequence (including
// jail.set, loadVendorLibraries, verifyProxySystem, injectErrorHandler) —
// plus the eval path itself. Designed to flush out hangs that occur
// "1 in N" isolate boots without paying for full process restarts.
//
// Usage:
//   node --experimental-vm-modules scripts/hang-repro-eval.mjs
//
// Knobs (env vars):
//   POOL_SIZE          isolate pool size (default 4)
//   CONCURRENCY        parallel eval workers (default 8)
//   ITERATIONS         hard cap on evals across all workers (default Infinity)
//   PER_EVAL_TIMEOUT_MS  how long to wait for a single eval before flagging a hang (default 30000)
//   EXPR               expression text to evaluate (default: a small Luxon-using expr)

import { setTimeout as sleep } from 'node:timers/promises';

// Lazy import so config gets picked up from env first
process.env.N8N_EXPRESSION_ENGINE = process.env.N8N_EXPRESSION_ENGINE || 'vm';
process.env.N8N_EXPRESSION_ENGINE_POOL_SIZE =
  process.env.N8N_EXPRESSION_ENGINE_POOL_SIZE || process.env.POOL_SIZE || '4';

const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const ITERATIONS = Number(process.env.ITERATIONS || Infinity);
const PER_EVAL_TIMEOUT_MS = Number(process.env.PER_EVAL_TIMEOUT_MS || 30_000);
const EXPR = process.env.EXPR || '{{ $now.toISO() + " " + [1,2,3].map(x => x*2).join(",") }}';

const startedAt = Date.now();
let completed = 0;
let inflight = 0;
let lastReportAt = startedAt;
let hung = false;

function ts() { return new Date().toISOString(); }

async function loadExpressionEngine() {
  // Pull the in-repo Expression class via its compiled output. Adjust if your
  // build location differs. This avoids reimplementing engine init from scratch.
  const mod = await import('@n8n/expression-runtime');
  // Construct an evaluator the same way Expression.initExpressionEngine does.
  // Easier: just call initExpressionEngine and grab the evaluator from the
  // Expression namespace.
  const workflow = await import('n8n-workflow');
  await workflow.Expression.initExpressionEngine({
    engine: 'vm',
    poolSize: Number(process.env.N8N_EXPRESSION_ENGINE_POOL_SIZE),
    maxCodeCacheSize: 100,
    bridgeTimeout: 5000,
    bridgeMemoryLimit: 128,
  });

  // Build a minimal workflow stub that satisfies Expression.evaluate's needs.
  const { Workflow } = workflow;
  const wf = new Workflow({
    id: 'repro',
    name: 'repro',
    nodes: [
      {
        id: 'n1',
        name: 'Start',
        type: 'n8n-nodes-base.start',
        typeVersion: 1,
        position: [0, 0],
        parameters: {},
      },
    ],
    connections: {},
    active: false,
    nodeTypes: {
      // Minimal node-types shim — only what Expression evaluate touches.
      getByNameAndVersion: () => ({ description: { properties: [] } }),
    },
    settings: {},
  });

  return { workflow, wf };
}

async function oneEval(ctx, n) {
  const { workflow, wf } = ctx;
  const started = Date.now();
  inflight++;
  try {
    const race = Promise.race([
      workflow.Expression.resolveSimpleParameterValue(
        EXPR, {}, {}, 0, 'n1', 'Start', 'manual', '', [], {},
      ),
      sleep(PER_EVAL_TIMEOUT_MS).then(() => { throw new Error('PER_EVAL_TIMEOUT'); }),
    ]);
    await race;
    const elapsed = Date.now() - started;
    completed++;
    if (elapsed > 1000) console.log(`[${ts()}] slow eval #${n}: ${elapsed}ms`);
  } catch (err) {
    if (err.message === 'PER_EVAL_TIMEOUT') {
      hung = true;
      console.error(`[${ts()}] HANG: eval #${n} did not complete within ${PER_EVAL_TIMEOUT_MS}ms`);
      console.error('  process kept alive — attach an inspector. Active handles:');
      console.error(`  active resources: ${JSON.stringify(process.getActiveResourcesInfo?.() || [])}`);
      console.error(`  PID: ${process.pid}`);
      // Stop spawning more, but don't exit — let the user attach and inspect.
      throw err;
    }
    console.error(`[${ts()}] eval #${n} error: ${err.message}`);
  } finally {
    inflight--;
  }
}

function reporter() {
  setInterval(() => {
    const now = Date.now();
    const rate = completed / ((now - startedAt) / 1000);
    console.log(`[${ts()}] completed=${completed} inflight=${inflight} rate=${rate.toFixed(1)}/s`);
    lastReportAt = now;
  }, 5000).unref();
}

async function main() {
  console.log(`[${ts()}] booting expression engine (pool=${process.env.N8N_EXPRESSION_ENGINE_POOL_SIZE}, concurrency=${CONCURRENCY})`);
  const ctx = await loadExpressionEngine();
  console.log(`[${ts()}] engine ready, starting eval loop`);
  reporter();

  let n = 0;
  // Maintain CONCURRENCY workers running independently.
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (!hung && n < ITERATIONS) {
      const myN = ++n;
      await oneEval(ctx, myN);
    }
  });

  try {
    await Promise.all(workers);
  } catch (err) {
    if (err.message !== 'PER_EVAL_TIMEOUT') throw err;
  }

  if (hung) {
    console.error(`[${ts()}] loop stopped due to hang. process left alive for inspection.`);
    // Keep the loop alive so the user can attach an inspector
    setInterval(() => {}, 1 << 30);
  } else {
    console.log(`[${ts()}] reached ITERATIONS=${ITERATIONS}, total completed=${completed}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
