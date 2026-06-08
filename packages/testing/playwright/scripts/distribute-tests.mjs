#!/usr/bin/env node
// @ts-check

/**
 * n8n CI Adapter for Test Distribution
 *
 * Thin wrapper that calls `janitor distribute` for generic shard distribution,
 * then maps capabilities to n8n-specific Docker images for the CI matrix.
 *
 * Impact scoping is a domain-partitioned UNION of two analyzers (DEVP-364):
 *   - app-source partition (changes outside packages/testing/playwright/)
 *     → V8 coverage map via `janitor select-e2e` (see select-affected-e2e.mjs)
 *   - playwright-internal partition (changes inside the playwright package)
 *     → AST walk via `janitor impact --test-list`
 * Union the two spec sets, write to a temp file, then `orchestrate
 * --include-specs-file=<that>` balances shards against the union.
 *
 * FAIL-OPEN at every layer: if EITHER analyzer bails to broad (V8 map missing,
 * AST throws, etc.), broad wins — `orchestrate` runs without the allowlist and
 * the full suite ships. Never skip a test on uncertainty.
 *
 * Usage:
 *   node distribute-tests.mjs --matrix <shards> --orchestrate  # GitHub Actions matrix with images
 *   node distribute-tests.mjs --matrix <shards>                # Simple matrix (no distribution)
 *   node distribute-tests.mjs <shards> <index>                 # Specs for a single shard
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYWRIGHT_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const JANITOR_CLI = path.resolve(__dirname, '..', '..', 'janitor', 'dist', 'cli.js');
const SELECT_AFFECTED_E2E = path.resolve(__dirname, 'select-affected-e2e.mjs');
const PLAYWRIGHT_PREFIX = path.relative(REPO_ROOT, PLAYWRIGHT_DIR) + path.sep;
const CONTAINER_STARTUP_TIME = 22_500; // 22.5s average per fixture

// Specs excluded from orchestrated distribution. Under coverage instrumentation
// (no container reuse + slower execution), high-flake specs balloon into
// multi-minute retry tails that tip a single shard over its timeout. Quarantine
// them here until the flakiness is fixed via the Flaky pipeline.
//   tests/e2e/ai/hitl-for-tools.spec.ts — 34.2% flakyRate (2x next worst)
const QUARANTINE = new Set(['tests/e2e/ai/hitl-for-tools.spec.ts']);

const CAPABILITY_IMAGES = {
	email: ['mailpit'],
	kafka: ['kafka'],
	observability: ['victoriaLogs', 'victoriaMetrics', 'vector', 'jaeger', 'n8nTracer'],
	oidc: ['keycloak'],
	proxy: ['mockserver'],
	'source-control': ['gitea'],
};

const BASE_IMAGES = ['postgres', 'redis', 'caddy', 'n8n', 'taskRunner'];

function getRequiredImages(capabilities) {
	const images = new Set(BASE_IMAGES);
	for (const cap of capabilities) {
		const capImages = CAPABILITY_IMAGES[cap];
		if (capImages) {
			for (const img of capImages) images.add(img);
		}
	}
	return [...images].sort();
}

/**
 * Partition CSV of changed files into (a) inside the playwright package,
 * (b) everywhere else. The AST analyzer can only trace (a); the V8 coverage
 * map keys on (b). Empty CSVs short-circuit to empty arrays.
 */
function partitionFiles(filesCsv) {
	const internal = [];
	const external = [];
	for (const raw of filesCsv.split(',')) {
		const f = raw.trim();
		if (!f) continue;
		if (f.startsWith(PLAYWRIGHT_PREFIX)) internal.push(f);
		else external.push(f);
	}
	return { internal, external };
}

/**
 * Query the V8 coverage map for specs affected by app-source changes.
 *
 * Returns `{ broad: true, reason }` whenever the underlying selection is broad
 * (map missing/stale/corrupt, or any unmapped change file). Broad propagates
 * up the union as "broad wins" — orchestrate runs without the allowlist.
 *
 * Any thrown error from the wrapper is caught and treated as broad — fail-open.
 */
function selectV8Specs(externalFiles) {
	if (externalFiles.length === 0)
		return { broad: false, specs: new Set(), reason: 'no app-source changes' };
	try {
		const out = execFileSync('node', [SELECT_AFFECTED_E2E, ...externalFiles], {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'inherit'],
		});
		const parsed = JSON.parse(out);
		if (parsed.mode === 'broad') {
			return {
				broad: true,
				reason: parsed.failOpen ?? `unmapped: ${(parsed.unmapped ?? []).join(', ')}`,
			};
		}
		return { broad: false, specs: new Set(parsed.specs ?? []) };
	} catch (error) {
		return { broad: true, reason: `select-e2e failed: ${String(error)}` };
	}
}

/**
 * Query the AST walker for specs affected by playwright-internal changes.
 *
 * Returns a Set of spec paths (playwright-root-relative) or `{ broad: true }`
 * if the analyzer fails. The AST walk only sees relationships expressed in
 * source — a change to a non-test file the walker doesn't recognise is
 * silently dropped, but that is the AST's own concern; we only fail-open on
 * thrown errors, matching the V8 path.
 */
function selectAstSpecs(internalFiles, base) {
	if (internalFiles.length === 0) return { broad: false, specs: new Set() };
	// Strip the playwright prefix — janitor runs with cwd=PLAYWRIGHT_DIR.
	const normalized = internalFiles.map((f) =>
		f.startsWith(PLAYWRIGHT_PREFIX) ? f.slice(PLAYWRIGHT_PREFIX.length) : f,
	);
	const cliArgs = ['impact', '--test-list', `--files=${normalized.join(',')}`];
	if (base) cliArgs.push(`--base=${base}`);
	try {
		const out = execFileSync('node', [JANITOR_CLI, ...cliArgs], {
			cwd: PLAYWRIGHT_DIR,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'inherit'],
		});
		const specs = out
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
		return { broad: false, specs: new Set(specs) };
	} catch (error) {
		return { broad: true, reason: `ast impact failed: ${String(error)}` };
	}
}

function logSelectionDecision(decision) {
	console.error('\n🎯 Impact selection:');
	console.error(`  mode: ${decision.mode}`);
	if (decision.v8) {
		const v8 = decision.v8;
		console.error(
			`  v8 (app-source): ${v8.broad ? `broad (${v8.reason})` : `${v8.specs.size} specs`}`,
		);
	} else {
		console.error('  v8 (app-source): skipped (no app-source changes)');
	}
	if (decision.ast) {
		const ast = decision.ast;
		console.error(
			`  ast (playwright): ${ast.broad ? `broad (${ast.reason})` : `${ast.specs.size} specs`}`,
		);
	} else {
		console.error('  ast (playwright): skipped (no playwright changes)');
	}
	if (decision.unionSize !== undefined) {
		console.error(`  union: ${decision.unionSize} specs`);
	}
	console.error('');
}

function getOrchestration(numShards, options = {}) {
	const cliArgs = ['distribute', `--shards=${numShards}`];
	const includeFile = options.includeSpecsFile;
	if (includeFile) cliArgs.push(`--include-specs-file=${includeFile}`);
	const output = execFileSync('node', [JANITOR_CLI, ...cliArgs], {
		cwd: PLAYWRIGHT_DIR,
		encoding: 'utf-8',
		stdio: ['pipe', 'pipe', 'inherit'],
	});
	return JSON.parse(output);
}

/**
 * Resolve the impact decision for a CI run: union AST + V8 selection over the
 * changed-files partition, OR broad if either analyzer bails. Writes the union
 * to a temp file and returns its path (the caller passes it to orchestrate).
 *
 * Returns `null` when broad — caller orchestrates without the allowlist.
 */
function resolveImpactAllowlist(filesCsv, base) {
	const { internal, external } = partitionFiles(filesCsv);
	const v8 = selectV8Specs(external);
	const ast = selectAstSpecs(internal, base);

	// Fail-open: either bails → broad wins. Run everything.
	if (v8.broad || ast.broad) {
		logSelectionDecision({
			mode: 'broad',
			v8: external.length > 0 ? v8 : null,
			ast: internal.length > 0 ? ast : null,
		});
		return null;
	}

	const union = new Set([...(v8.specs ?? []), ...(ast.specs ?? [])]);
	logSelectionDecision({
		mode: 'scoped',
		v8: external.length > 0 ? v8 : null,
		ast: internal.length > 0 ? ast : null,
		unionSize: union.size,
	});

	const tmp = mkdtempSync(path.join(tmpdir(), 'distribute-tests-'));
	const allowPath = path.join(tmp, 'include-specs.txt');
	writeFileSync(allowPath, [...union].join('\n'));
	return allowPath;
}

const args = process.argv.slice(2);
const matrixMode = args.includes('--matrix');
const orchestrateMode = args.includes('--orchestrate');
const impactMode = args.includes('--impact');
const filesArg = args.find((a) => a.startsWith('--files='))?.slice('--files='.length) || undefined;
const baseArg = args.find((a) => a.startsWith('--base='))?.slice('--base='.length) || undefined;
const shards = parseInt(args.find((a) => !a.startsWith('-')) ?? '');

if (!shards || shards < 1) {
	console.error('Usage: node distribute-tests.mjs --matrix <shards> [--orchestrate] [--impact]');
	console.error('       node distribute-tests.mjs <shards> <index>');
	process.exit(1);
}

let includeSpecsFile;
let cleanupPaths = [];
if (impactMode && filesArg) {
	includeSpecsFile = resolveImpactAllowlist(filesArg, baseArg);
	if (includeSpecsFile) cleanupPaths.push(path.dirname(includeSpecsFile));
} else if (impactMode) {
	console.error('Impact: no --files provided — running full suite');
}

function cleanup() {
	for (const p of cleanupPaths) {
		try {
			rmSync(p, { recursive: true, force: true });
		} catch {
			// best-effort
		}
	}
}

if (matrixMode) {
	if (!orchestrateMode) {
		const matrix = Array.from({ length: shards }, (_, i) => ({
			shard: i + 1,
			specs: '',
			images: '',
		}));
		console.log(JSON.stringify(matrix));
	} else {
		const result = getOrchestration(shards, { includeSpecsFile });

		if (result.shards.length === 0) {
			console.error('\n⏭️  No specs to run — all filtered out by discovery/impact. Skipping.\n');
			console.log(JSON.stringify([{ shard: 1, specs: '', images: '', skip: true }]));
		} else {
			console.error('\n📊 Shard Distribution:');
			let maxShardTime = 0;
			for (const shard of result.shards) {
				const overhead = shard.fixtureCount * CONTAINER_STARTUP_TIME;
				const totalTime = shard.testTime + overhead;
				maxShardTime = Math.max(maxShardTime, totalTime);
				const testMins = (shard.testTime / 60_000).toFixed(1);
				const totalMins = (totalTime / 60_000).toFixed(1);
				const caps = shard.capabilities.length > 0 ? ` [${shard.capabilities.join(', ')}]` : '';
				console.error(
					`  Shard ${shard.shard}: ${shard.specs.length} specs, ${testMins} min test + ${(overhead / 1000).toFixed(0)}s startup = ${totalMins} min${caps}`,
				);
			}
			const totalTestMins = (result.totalTestTime / 60_000).toFixed(1);
			console.error(`\n  Total test time: ${totalTestMins} min`);
			console.error(
				`  Expected wall-clock: ~${(maxShardTime / 60_000).toFixed(1)} min (longest shard)\n`,
			);

			const matrix = result.shards.map((shard) => ({
				shard: shard.shard,
				specs: shard.specs.filter((s) => !QUARANTINE.has(s)).join(' '),
				images: getRequiredImages(shard.capabilities).join(' '),
			}));
			console.log(JSON.stringify(matrix));
		}
	}
} else {
	const index = parseInt(args[1]);
	if (isNaN(index) || index < 0 || index >= shards) {
		console.error(`Index must be between 0 and ${shards - 1}`);
		cleanup();
		process.exit(1);
	}
	const result = getOrchestration(shards, { includeSpecsFile });
	const shard = result.shards[index];
	if (shard) {
		console.log(shard.specs.filter((s) => !QUARANTINE.has(s)).join('\n'));
	}
}

cleanup();
