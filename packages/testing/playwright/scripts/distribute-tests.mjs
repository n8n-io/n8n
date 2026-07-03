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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

// Sentinel: a changed data file the AST walker cannot attribute → fail open to
// the full suite (never skip). Propagated up as `{ broad: true }`.
export const BROAD = Symbol('broad');

// `expectations/<folder>` → the consuming .ts entrypoints (playwright-root-relative).
// The expectations dir holds recorded proxy/tool responses replayed by specs at
// RUNTIME (fs.readdir/readFile via proxy.loadExpectations, or the instance-ai
// fixture's EXPECTATIONS_DIR join) — never a static import. So the AST import
// graph can't reach them; without this map they'd select zero specs and skip
// E2E (violating impact-map.md §7 "never skip, only narrow").
//
// Fixture entrypoints (chat-hub, execution.logs, instance-ai) auto-expand to
// every spec that imports them via the AST graph — drift-free as specs are
// added. The remaining folders call loadExpectations('<folder>') inline in the
// spec (no dedicated fixture), so they map to the exact consuming spec file(s).
export const EXPECTATIONS_CONSUMERS = {
	'chat-hub': ['tests/e2e/chat-hub/fixtures.ts'],
	'execution.logs': ['tests/e2e/workflows/editor/execution/fixtures.ts'],
	'instance-ai': ['tests/e2e/instance-ai/fixtures.ts'],
	evaluations: ['tests/e2e/ai/evaluations.spec.ts'],
	'hitl-for-tools': ['tests/e2e/ai/hitl-for-tools.spec.ts'],
	langchain: [
		'tests/e2e/ai/langchain-agents.spec.ts',
		'tests/e2e/ai/langchain-tools.spec.ts',
		'tests/e2e/ai/langchain-chains.spec.ts',
		'tests/e2e/ai/langchain-memory.spec.ts',
		'tests/e2e/ai/langchain-vectorstores.spec.ts',
	],
	'proxy-server': ['tests/e2e/capabilities/proxy-server.spec.ts'],
	'workflow-builder': ['tests/e2e/ai/workflow-builder.spec.ts'],
	// 'instance-ai-memory' intentionally absent — orphaned (only a .gitignore, no
	// consumer). A change to it therefore resolves to BROAD, the safe default.
};

const EXPECTATIONS_PREFIX = 'expectations/';

/**
 * Map a playwright-relative non-.ts internal file to its consumer .ts
 * entrypoints, or {@link BROAD} if it can't be attributed (not under
 * expectations/, or an expectations folder with no map entry). Never returns an
 * empty array — an unmapped file must fail open to broad, never "no specs".
 */
export function resolveExpectationConsumers(relFile) {
	if (!relFile.startsWith(EXPECTATIONS_PREFIX)) return BROAD;
	const folder = relFile.slice(EXPECTATIONS_PREFIX.length).split('/')[0];
	const consumers = EXPECTATIONS_CONSUMERS[folder];
	return consumers && consumers.length > 0 ? consumers : BROAD;
}

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
function selectV8Specs(externalFiles, base) {
	if (externalFiles.length === 0)
		return { broad: false, specs: new Set(), reason: 'no app-source changes' };
	try {
		const out = execFileSync('node', [SELECT_AFFECTED_E2E, ...externalFiles], {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'inherit'],
			// Pass the merge-base so `select` can read changed package.json
			// before/after and drop a devDependency-only lockfile change.
			env: { ...process.env, BASE_REF: base ?? '' },
		});
		const parsed = JSON.parse(out);
		if (parsed.mode === 'broad') {
			return {
				broad: true,
				reason: parsed.failOpen ?? `unmapped: ${(parsed.unmapped ?? []).join(', ')}`,
			};
		}
		// Coverage-gap alarm: changes with no E2E that verifies them aren't run
		// (unit + the sanity spec are the net) — but surface the gap, don't hide it.
		if (parsed.uncovered?.length) {
			const sample = parsed.uncovered.slice(0, 5).join(', ');
			const more = parsed.uncovered.length > 5 ? `, +${parsed.uncovered.length - 5} more` : '';
			console.error(
				`  ⚠ ${parsed.uncovered.length} changed file(s) have no E2E coverage — not run, relying on unit + sanity: ${sample}${more}`,
			);
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
 * source (static imports), so it cannot attribute a non-.ts data file loaded at
 * runtime (e.g. `expectations/**`). Rather than let those silently drop to an
 * empty selection (→ skip E2E), we route each to its consuming .ts entrypoint(s)
 * via {@link resolveExpectationConsumers} and feed them into the AST walk; any
 * file we can't attribute fails open to broad (impact-map.md §7). We still
 * fail-open on thrown errors too, matching the V8 path.
 */
function selectAstSpecs(internalFiles, base) {
	if (internalFiles.length === 0) return { broad: false, specs: new Set() };
	// Strip the playwright prefix — janitor runs with cwd=PLAYWRIGHT_DIR.
	const normalized = internalFiles.map((f) =>
		f.startsWith(PLAYWRIGHT_PREFIX) ? f.slice(PLAYWRIGHT_PREFIX.length) : f,
	);

	// The AST walker only understands .ts sources/specs. Route each non-.ts data
	// file to its consuming .ts entrypoint(s); an unattributable one → broad.
	const extraConsumers = new Set();
	for (const f of normalized.filter((f) => !f.endsWith('.ts'))) {
		const consumers = resolveExpectationConsumers(f);
		if (consumers === BROAD) return { broad: true, reason: `unattributable internal file: ${f}` };
		for (const c of consumers) extraConsumers.add(c);
	}

	const astInput = [...normalized.filter((f) => f.endsWith('.ts')), ...extraConsumers];
	if (astInput.length === 0) return { broad: false, specs: new Set() };

	const cliArgs = ['impact', '--test-list', `--files=${astInput.join(',')}`];
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
	const v8 = selectV8Specs(external, base);
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

function runMain() {
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
}

// Only execute when invoked directly — keeps the module importable for tests.
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
	runMain();
}
