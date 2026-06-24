import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	buildPayload,
	coverageForLedger,
	makeChurnFor,
	makeFixDensityFor,
	makeSignalLookups,
} from './emit-payload.mjs';

const summaryFixture = () => ({
	threshold: 60,
	generatedAt: '2026-06-24T03:30:00.000Z',
	files: [
		{
			file: 'src/hot.ts',
			score: 42,
			thresholdMet: false,
			coverage: 0.5,
			counts: { killed: 3, survived: 2, noCoverage: 1, timeout: 0, runtimeError: 0 },
		},
		{
			file: 'src/cold.ts',
			score: 90,
			thresholdMet: true,
			coverage: 0.95,
			counts: { killed: 9, survived: 0, noCoverage: 0, timeout: 1, runtimeError: 0 },
		},
	],
});

describe('coverageForLedger', () => {
	it('prefers the written-back coverage, clamped to [0,1]', () => {
		assert.equal(coverageForLedger({ coverage: 0.5 }), 0.5);
		assert.equal(coverageForLedger({ coverage: 1.7 }), 1);
		assert.equal(coverageForLedger({ coverage: -0.3 }), 0);
	});

	it('derives from mutant counts when coverage is absent', () => {
		assert.equal(
			coverageForLedger({ counts: { killed: 3, survived: 1, timeout: 0, noCoverage: 0 } }),
			1,
		);
		assert.equal(
			coverageForLedger({ counts: { killed: 1, survived: 0, timeout: 0, noCoverage: 1 } }),
			0.5,
		);
	});

	it('returns null when neither source is usable', () => {
		assert.equal(coverageForLedger({}), null);
	});
});

describe('makeSignalLookups', () => {
	const signals = {
		churn: {
			'packages/workflow/src/hot.ts': { commits: 7, linesChanged: 120 },
			'packages/workflow/src/bare.ts': 4,
		},
		fixDensity: {
			'packages/workflow/src/hot.ts': 3.14159,
		},
	};

	it('reads the per-file commit count for churn', () => {
		const { churnFor } = makeSignalLookups(signals);
		assert.equal(churnFor('packages/workflow/src/hot.ts'), 7);
	});

	it('accepts a bare numeric churn entry', () => {
		const { churnFor } = makeSignalLookups(signals);
		assert.equal(churnFor('packages/workflow/src/bare.ts'), 4);
	});

	it('reads and rounds fix-density', () => {
		const { fixDensityFor } = makeSignalLookups(signals);
		assert.equal(fixDensityFor('packages/workflow/src/hot.ts'), 3.1416);
	});

	it('returns known-zero (not null) for a file absent from the signals map', () => {
		const { churnFor, fixDensityFor } = makeSignalLookups(signals);
		assert.equal(churnFor('packages/workflow/src/cold.ts'), 0);
		assert.equal(fixDensityFor('packages/workflow/src/cold.ts'), 0);
	});

	it('tolerates an empty or partial signals object', () => {
		const { churnFor, fixDensityFor } = makeSignalLookups({});
		assert.equal(churnFor('any.ts'), 0);
		assert.equal(fixDensityFor('any.ts'), 0);
	});
});

describe('buildPayload with signal lookups', () => {
	it('lands non-null churn/fix_density when signals carry the file (DEVP-552)', () => {
		const signals = {
			churn: { 'packages/workflow/src/hot.ts': { commits: 7, linesChanged: 120 } },
			fixDensity: { 'packages/workflow/src/hot.ts': 2.5 },
		};
		const { churnFor, fixDensityFor } = makeSignalLookups(signals);

		const { ledger, events } = buildPayload(summaryFixture(), {
			pkg: 'n8n-workflow',
			sha: 'deadbeef',
			pkgRelToRepo: 'packages/workflow',
			churnFor,
			fixDensityFor,
		});

		const hot = ledger.find((r) => r.source_file_path === 'packages/workflow/src/hot.ts');
		assert.equal(hot.churn, 7);
		assert.equal(hot.fix_density, 2.5);
		assert.notEqual(hot.churn, null);
		assert.notEqual(hot.fix_density, null);

		// A scored file with no signal entry is known-zero, never null.
		const cold = ledger.find((r) => r.source_file_path === 'packages/workflow/src/cold.ts');
		assert.equal(cold.churn, 0);
		assert.equal(cold.fix_density, 0);

		// Same values flow into the perf-metric event dimensions.
		const hotEvent = events.find(
			(e) => e.dimensions.source_file === 'packages/workflow/src/hot.ts',
		);
		assert.equal(hotEvent.dimensions.churn, 7);
		assert.equal(hotEvent.dimensions.fix_density, 2.5);
	});

	it('defaults to null churn/fix_density without signal lookups', () => {
		const { ledger } = buildPayload(summaryFixture(), {
			pkg: 'n8n-workflow',
			sha: 'deadbeef',
			pkgRelToRepo: 'packages/workflow',
		});
		assert.equal(ledger[0].churn, null);
		assert.equal(ledger[0].fix_density, null);
	});
});

describe('git fallback factories degrade to null on a shallow clone', () => {
	// The shallow-clone signature emit-payload originally hit in the mutate job:
	// both factories must emit null rather than a misleadingly low signal.
	const shallowRunGit = (args) => {
		if (args[0] === 'rev-parse' && args.includes('--is-shallow-repository')) return 'true\n';
		return '';
	};

	it('makeChurnFor returns null for every file under a shallow clone', () => {
		const churnFor = makeChurnFor({ runGit: shallowRunGit });
		assert.equal(churnFor('packages/workflow/src/hot.ts'), null);
	});

	it('makeFixDensityFor returns null for every file under a shallow clone', () => {
		const fixDensityFor = makeFixDensityFor({ runGit: shallowRunGit });
		assert.equal(fixDensityFor('packages/workflow/src/hot.ts'), null);
	});
});
