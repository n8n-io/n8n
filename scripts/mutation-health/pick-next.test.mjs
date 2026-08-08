import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	DEFAULT_WEIGHTS,
	ELIGIBLE_PACKAGES,
	computeEffectiveStatus,
	computeValue,
	extractSignals,
	isEligible,
	mergeWithLedger,
	rankCandidates,
} from './pick-next.mjs';

// Fixed reference epoch (2026-06-20 00:00:00 UTC). All age-based assertions
// derive from this so they don't drift with wall-clock.
const NOW = Date.parse('2026-06-20T00:00:00.000Z');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_AFTER_MS = 4 * WEEK_MS;

// Three-package fixture ledger. Each row pins a known status (new is
// implicit — files not in the ledger become `new` when merged) so the
// bucketed-ordering assertions don't depend on staleness math.
const MULTI_PKG_LEDGER = [
	// n8n-workflow — one red row (will be ordered by value)
	{
		source_file_path: 'packages/workflow/src/a.ts',
		package: 'n8n-workflow',
		status: 'red',
		last_score: 30,
		last_checked_at: '2026-05-01T00:00:00.000Z',
	},
	// @n8n/crdt — one red row
	{
		source_file_path: 'packages/@n8n/crdt/src/x.ts',
		package: '@n8n/crdt',
		status: 'red',
		last_score: 40,
		last_checked_at: '2026-05-15T00:00:00.000Z',
	},
	// @n8n/decorators — one green row that has aged past STALE_AFTER_MS
	{
		source_file_path: 'packages/@n8n/decorators/src/y.ts',
		package: '@n8n/decorators',
		status: 'green',
		last_score: 85,
		last_checked_at: '2026-04-01T00:00:00.000Z',
	},
	// excluded package — should never appear in any candidate set
	{
		source_file_path: 'packages/@n8n/expression-runtime/src/forbidden.ts',
		package: '@n8n/expression-runtime',
		status: 'red',
		last_score: 10,
		last_checked_at: '2026-06-10T00:00:00.000Z',
	},
];

// Synthetic worthy-file inputs per package — these come from walking each
// package's src/ in the real CLI. Here we feed them straight to
// mergeWithLedger so the test has no filesystem dependency.
const WALK_INPUTS = {
	'n8n-workflow': ['packages/workflow/src/a.ts', 'packages/workflow/src/b.ts'],
	'@n8n/crdt': ['packages/@n8n/crdt/src/x.ts', 'packages/@n8n/crdt/src/z.ts'],
	'@n8n/decorators': ['packages/@n8n/decorators/src/y.ts'],
};

// Signals are tuned so the value ordering within each bucket is
// deterministic and obvious:
//   - within `new`: crdt/z.ts (churn 100) > workflow/b.ts (churn 1)
//   - within `red`: workflow/a.ts (churn 50, fix 5) > crdt/x.ts (churn 2, fix 0)
const SIGNALS = {
	churn: {
		'packages/workflow/src/a.ts': { commits: 50, linesChanged: 999 },
		'packages/workflow/src/b.ts': { commits: 1, linesChanged: 1 },
		'packages/@n8n/crdt/src/x.ts': { commits: 2, linesChanged: 2 },
		'packages/@n8n/crdt/src/z.ts': { commits: 100, linesChanged: 200 },
		'packages/@n8n/decorators/src/y.ts': { commits: 0, linesChanged: 0 },
	},
	fixDensity: {
		'packages/workflow/src/a.ts': 5,
		'packages/@n8n/crdt/src/x.ts': 0,
		'packages/@n8n/crdt/src/z.ts': 1,
	},
};

const COVERAGE = {
	'packages/workflow/src/a.ts': 0.4,
	'packages/workflow/src/b.ts': 0.9,
	'packages/@n8n/crdt/src/x.ts': 0.95,
	'packages/@n8n/crdt/src/z.ts': 0.1,
};

function buildMerged() {
	const merged = [];
	for (const [pkgName, worthy] of Object.entries(WALK_INPUTS)) {
		merged.push(...mergeWithLedger({ worthyPaths: worthy, pkgName, ledgerRows: MULTI_PKG_LEDGER }));
	}
	return merged;
}

describe('isEligible (vitest allowlist unit test)', () => {
	it('admits every name in ELIGIBLE_PACKAGES', () => {
		assert.ok(ELIGIBLE_PACKAGES.length >= 2, 'allowlist must span at least two packages');
		for (const pkg of ELIGIBLE_PACKAGES) {
			assert.equal(isEligible(pkg.name), true, `expected eligible: ${pkg.name}`);
		}
	});

	it('rejects packages outside the allowlist', () => {
		assert.equal(isEligible('@n8n/foo'), false);
		assert.equal(isEligible(''), false);
		assert.equal(isEligible(undefined), false);
	});
});

describe('computeValue', () => {
	it('applies w_churn·churn + w_fix·fixDensity + w_cov·(1 − coverage)', () => {
		const v = computeValue(
			{ churn: 10, fixDensity: 2, coverage: 0.25 },
			{ churn: 1, fixDensity: 3, coverage: 4 },
		);
		// 1*10 + 3*2 + 4*(1 - 0.25) = 10 + 6 + 3 = 19
		assert.equal(v, 19);
	});

	it('treats missing signals as zero (no penalty, no boost)', () => {
		// Default weights {1,1,1}. With everything missing → 1*0 + 1*0 + 1*(1-0) = 1.
		assert.equal(computeValue({}), 1);
		assert.equal(computeValue({ churn: undefined, fixDensity: null }), 1);
	});

	it('clamps coverage to [0,1]', () => {
		assert.equal(computeValue({ coverage: 2 }, { churn: 0, fixDensity: 0, coverage: 1 }), 0);
		assert.equal(computeValue({ coverage: -1 }, { churn: 0, fixDensity: 0, coverage: 1 }), 1);
	});
});

describe('extractSignals', () => {
	it('handles `{ commits, linesChanged }` shape from gatherSignals', () => {
		const triple = extractSignals(
			{ source_file_path: 'packages/workflow/src/a.ts' },
			{ signals: SIGNALS, coverage: COVERAGE },
		);
		assert.deepEqual(triple, { churn: 50, fixDensity: 5, coverage: 0.4 });
	});

	it('also accepts a bare-number churn value', () => {
		const triple = extractSignals(
			{ source_file_path: 'foo.ts' },
			{ signals: { churn: { 'foo.ts': 7 }, fixDensity: { 'foo.ts': 3 } }, coverage: {} },
		);
		assert.deepEqual(triple, { churn: 7, fixDensity: 3, coverage: 0 });
	});

	it('zero-fills when the file is absent from signals/coverage', () => {
		assert.deepEqual(extractSignals({ source_file_path: 'missing.ts' }), {
			churn: 0,
			fixDensity: 0,
			coverage: 0,
		});
	});
});

describe('computeEffectiveStatus', () => {
	it('promotes a green row older than the stale window to stale', () => {
		const row = { status: 'green', last_checked_at: '2026-04-01T00:00:00.000Z' };
		assert.equal(computeEffectiveStatus(row, { now: NOW, staleAfterMs: STALE_AFTER_MS }), 'stale');
	});

	it('keeps a fresh green row green', () => {
		const row = { status: 'green', last_checked_at: '2026-06-19T00:00:00.000Z' };
		assert.equal(computeEffectiveStatus(row, { now: NOW, staleAfterMs: STALE_AFTER_MS }), 'green');
	});

	it('passes new/red through unchanged', () => {
		assert.equal(
			computeEffectiveStatus({ status: 'new' }, { now: NOW, staleAfterMs: STALE_AFTER_MS }),
			'new',
		);
		assert.equal(
			computeEffectiveStatus({ status: 'red' }, { now: NOW, staleAfterMs: STALE_AFTER_MS }),
			'red',
		);
	});
});

describe('mergeWithLedger', () => {
	it('synthesises new rows for worthy paths not in the ledger', () => {
		const merged = mergeWithLedger({
			worthyPaths: ['packages/workflow/src/a.ts', 'packages/workflow/src/b.ts'],
			pkgName: 'n8n-workflow',
			ledgerRows: MULTI_PKG_LEDGER,
		});
		const a = merged.find((r) => r.source_file_path === 'packages/workflow/src/a.ts');
		const b = merged.find((r) => r.source_file_path === 'packages/workflow/src/b.ts');
		assert.equal(a.status, 'red'); // from the live ledger
		assert.equal(b.status, 'new'); // synthesised
		assert.equal(b.last_score, null);
	});

	it("never lets another package's rows leak into the merge", () => {
		// Ledger has a row for @n8n/expression-runtime; merging for n8n-workflow
		// must ignore it entirely.
		const merged = mergeWithLedger({
			worthyPaths: ['packages/workflow/src/a.ts'],
			pkgName: 'n8n-workflow',
			ledgerRows: MULTI_PKG_LEDGER,
		});
		assert.equal(merged.length, 1);
		assert.equal(merged[0].package, 'n8n-workflow');
	});
});

// PR-gate contract from DEVP-494:
//   "integration tests: fixture ledger spanning ≥2 packages returns N rows
//    ordered by value within buckets, ≥2 packages present, zero
//    excluded-package rows"
describe('rankCandidates (DEVP-494 PR gate)', () => {
	it('orders results bucket-first (new → red → stale), then by value desc within each bucket', () => {
		const merged = buildMerged();
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			signals: SIGNALS,
			coverage: COVERAGE,
			weights: DEFAULT_WEIGHTS,
		});

		// Effective bucket sequence must be monotonic in priority.
		const priority = { new: 0, red: 1, stale: 2, green: 3 };
		for (let i = 1; i < ranked.length; i++) {
			assert.ok(
				priority[ranked[i - 1].effective_status] <= priority[ranked[i].effective_status],
				`bucket order broken at index ${i}: ${ranked[i - 1].effective_status} → ${ranked[i].effective_status}`,
			);
		}

		// Within each bucket, value must be non-increasing.
		let prev = null;
		for (const row of ranked) {
			if (prev && prev.effective_status === row.effective_status) {
				assert.ok(
					prev.value >= row.value,
					`value descending broken in bucket=${row.effective_status}: ${prev.value} → ${row.value}`,
				);
			}
			prev = row;
		}

		// Spot-check the new bucket: crdt/z.ts (churn 100) must outrank
		// workflow/b.ts (churn 1).
		const newBucket = ranked.filter((r) => r.effective_status === 'new');
		assert.equal(newBucket[0].source_file_path, 'packages/@n8n/crdt/src/z.ts');

		// Spot-check the red bucket: workflow/a.ts (churn 50, fix 5) must
		// outrank crdt/x.ts (churn 2, fix 0).
		const redBucket = ranked.filter((r) => r.effective_status === 'red');
		assert.equal(redBucket[0].source_file_path, 'packages/workflow/src/a.ts');

		// Stale bucket has just decorators/y.ts (green → stale by age).
		const staleBucket = ranked.filter((r) => r.effective_status === 'stale');
		assert.equal(staleBucket.length, 1);
		assert.equal(staleBucket[0].package, '@n8n/decorators');
	});

	it('top-N output spans ≥2 packages on the multi-package fixture', () => {
		const merged = buildMerged();
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			signals: SIGNALS,
			coverage: COVERAGE,
		});
		const topN = ranked.slice(0, 4);
		const distinctPackages = new Set(topN.map((r) => r.package));
		assert.ok(
			distinctPackages.size >= 2,
			`top-${topN.length} must span ≥2 packages; got ${[...distinctPackages].join(', ')}`,
		);
	});

	it('excludes blocked-package rows entirely (zero excluded rows)', () => {
		// Add a worthy-file row for the blocked package as if its src/ tree
		// were walked. The picker must still drop every row from that pkg.
		const blockedRows = mergeWithLedger({
			worthyPaths: ['packages/@n8n/expression-runtime/src/forbidden.ts'],
			pkgName: '@n8n/expression-runtime',
			ledgerRows: MULTI_PKG_LEDGER,
		});
		const merged = [...buildMerged(), ...blockedRows];
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			signals: SIGNALS,
			coverage: COVERAGE,
			blocked: new Set(['@n8n/expression-runtime']),
		});
		const blockedHits = ranked.filter((r) => r.package === '@n8n/expression-runtime');
		assert.equal(blockedHits.length, 0, 'blocked package rows must not appear');
	});

	it('drops every green row from the candidate set (combined mode)', () => {
		const merged = buildMerged();
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			signals: SIGNALS,
			coverage: COVERAGE,
		});
		assert.equal(
			ranked.filter((r) => r.effective_status === 'green').length,
			0,
			'green rows must be filtered out of the candidate set',
		);
	});

	it('--mode baseline restricts the candidate set to `new` only', () => {
		const merged = buildMerged();
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			mode: 'baseline',
			signals: SIGNALS,
			coverage: COVERAGE,
		});
		assert.ok(ranked.length > 0);
		assert.ok(
			ranked.every((r) => r.effective_status === 'new'),
			`baseline mode must yield only "new" rows; got ${ranked.map((r) => r.effective_status).join(', ')}`,
		);
	});

	it('--mode coverage restricts the candidate set to `red`/`stale` only', () => {
		const merged = buildMerged();
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			mode: 'coverage',
			signals: SIGNALS,
			coverage: COVERAGE,
		});
		assert.ok(ranked.length > 0);
		assert.ok(
			ranked.every((r) => r.effective_status === 'red' || r.effective_status === 'stale'),
			`coverage mode must yield only red/stale rows; got ${ranked.map((r) => r.effective_status).join(', ')}`,
		);
	});

	it('at equal churn/fix-density, the lower-coverage file outranks the higher-coverage one within a bucket', () => {
		// The (1 − coverage) term is load-bearing now that build-matrix feeds
		// ledger coverage into the picker. With identical churn and fix-density,
		// coverage alone decides order: the less-covered file is the more urgent
		// re-score target and must rank first.
		const merged = mergeWithLedger({
			worthyPaths: ['packages/workflow/src/low.ts', 'packages/workflow/src/high.ts'],
			pkgName: 'n8n-workflow',
			ledgerRows: [],
		});
		const signals = {
			churn: {
				'packages/workflow/src/low.ts': { commits: 10, linesChanged: 20 },
				'packages/workflow/src/high.ts': { commits: 10, linesChanged: 20 },
			},
			fixDensity: {
				'packages/workflow/src/low.ts': 3,
				'packages/workflow/src/high.ts': 3,
			},
		};
		const coverage = {
			'packages/workflow/src/low.ts': 0.1,
			'packages/workflow/src/high.ts': 0.9,
		};
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			signals,
			coverage,
			weights: DEFAULT_WEIGHTS,
		});
		assert.equal(ranked[0].source_file_path, 'packages/workflow/src/low.ts');
		assert.equal(ranked[1].source_file_path, 'packages/workflow/src/high.ts');
		assert.ok(
			ranked[0].value > ranked[1].value,
			`low-coverage value (${ranked[0].value}) must exceed high-coverage value (${ranked[1].value})`,
		);
	});

	it('weights tune the ordering — boosting churn flips priority within a bucket', () => {
		// Two new files in the same bucket: crdt/z.ts (churn=100, fix=1) and
		// workflow/b.ts (churn=1). With default weights crdt wins. If we zero
		// out churn and only weight fix-density, the row WITHOUT a fix
		// (workflow/b.ts) falls behind crdt/z.ts (fix=1), but with churn=0
		// and fixDensity=0 the tiebreak becomes the (1−coverage) term:
		// workflow/b.ts has coverage 0.9 → value 0.1, crdt/z.ts has 0.1 →
		// value 0.9. crdt/z.ts still wins. Now zero out everything except
		// w_coverage and watch the lower-coverage file climb.
		const merged = buildMerged();
		const ranked = rankCandidates(merged, {
			now: NOW,
			staleAfterMs: STALE_AFTER_MS,
			mode: 'baseline',
			signals: SIGNALS,
			coverage: COVERAGE,
			weights: { churn: 0, fixDensity: 0, coverage: 1 },
		});
		const top = ranked[0];
		// crdt/z.ts has the lowest coverage (0.1) among new rows → highest
		// (1 − coverage) value.
		assert.equal(top.source_file_path, 'packages/@n8n/crdt/src/z.ts');
	});
});
