import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
	type ChangedFile,
	type ImpactMap,
	type LcovInput,
	mergeCoverage,
	parseLcov,
	resolveImpact,
} from './coverage-map.js';

// ---------------------------------------------------------------------------
// Model + generators
//
// A test "execution" = one spec running one function (file, fnLine) some number
// of times. hits === 0 models a function that was LOADED but not executed (must
// NOT be attributed). We build per-spec lcovs from a list of executions and
// assert the map/selector against that ground truth.
// ---------------------------------------------------------------------------

interface Exec {
	spec: string;
	file: string;
	fnLine: number;
	hits: number;
}

const fnName = (line: number) => `fn${line}`;

/** Bounded domains so specs/files/functions overlap — exercises merge + dedup. */
const arbExec: fc.Arbitrary<Exec> = fc.record({
	spec: fc.integer({ min: 0, max: 4 }).map((n) => `tests/e2e/s${n}.spec.ts`),
	file: fc.integer({ min: 0, max: 3 }).map((n) => `packages/p${n}/src/f.ts`),
	fnLine: fc.integer({ min: 1, max: 6 }).map((n) => n * 10), // 10,20,...,60
	hits: fc.nat({ max: 5 }),
});

// At most one exec per (spec, file, fnLine) so each per-spec lcov is well-formed.
const arbExecs: fc.Arbitrary<Exec[]> = fc.uniqueArray(arbExec, {
	maxLength: 30,
	selector: (e) => `${e.spec}|${e.file}|${e.fnLine}`,
});

/** Build per-spec lcov inputs from executions (one TN per spec, one SF per file). */
function buildInputs(execs: Exec[]): LcovInput[] {
	const bySpec = new Map<string, Map<string, Exec[]>>();
	for (const e of execs) {
		const byFile = bySpec.get(e.spec) ?? new Map<string, Exec[]>();
		bySpec.set(e.spec, byFile);
		byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
	}
	const inputs: LcovInput[] = [];
	for (const [spec, byFile] of bySpec) {
		const lines: string[] = [`TN:${spec}`];
		for (const [file, fns] of byFile) {
			lines.push(`SF:${file}`);
			for (const f of fns) lines.push(`FN:${f.fnLine},${fnName(f.fnLine)}`);
			for (const f of fns) lines.push(`FNDA:${f.hits},${fnName(f.fnLine)}`);
			for (const f of fns) lines.push(`DA:${f.fnLine},${f.hits}`);
			lines.push('end_of_record');
		}
		inputs.push({ text: lines.join('\n') + '\n', spec });
	}
	return inputs;
}

const shuffle = <T>(xs: T[], keys: number[]): T[] =>
	xs
		.map((x, i) => [x, keys[i] ?? 0] as const)
		.sort((a, b) => a[1] - b[1])
		.map(([x]) => x);

// ===========================================================================
// Unit tests — concrete, readable contracts
// ===========================================================================

describe('parseLcov', () => {
	it('parses TN/SF/FN/FNDA/DA into per-spec records', () => {
		const recs = parseLcov(
			'TN:spec-a\nSF:packages/cli/src/x.ts\nFN:5,foo\nFNDA:3,foo\nDA:5,3\nend_of_record\n',
		);
		expect(recs).toHaveLength(1);
		expect(recs[0]).toMatchObject({ spec: 'spec-a', file: 'packages/cli/src/x.ts' });
		expect(recs[0].fns).toEqual([{ name: 'foo', line: 5, hits: 3 }]);
	});

	it('falls back to fallbackSpec when TN is absent or empty', () => {
		const recs = parseLcov('SF:a.ts\nFN:1,f\nFNDA:1,f\nend_of_record\n', 'fallback');
		expect(recs[0].spec).toBe('fallback');
	});
});

describe('mergeCoverage', () => {
	it('attributes a function to every spec that executed it (hits > 0)', () => {
		const { impactMap } = mergeCoverage([
			{ spec: 'A', text: 'TN:A\nSF:f.ts\nFN:10,fn\nFNDA:2,fn\nend_of_record\n' },
			{ spec: 'B', text: 'TN:B\nSF:f.ts\nFN:10,fn\nFNDA:1,fn\nend_of_record\n' },
		]);
		expect(impactMap['f.ts']['10']).toEqual(['A', 'B']);
	});

	it('excludes load-only functions (hits === 0) from the map', () => {
		const { impactMap } = mergeCoverage([
			{
				spec: 'A',
				text: 'TN:A\nSF:f.ts\nFN:10,hit\nFN:20,loaded\nFNDA:4,hit\nFNDA:0,loaded\nend_of_record\n',
			},
		]);
		expect(impactMap['f.ts']['10']).toEqual(['A']);
		expect(impactMap['f.ts']['20']).toBeUndefined();
	});

	it('sums hit counts across specs in the unified lcov', () => {
		const { lcov } = mergeCoverage([
			{ spec: 'A', text: 'TN:A\nSF:f.ts\nFN:10,fn\nFNDA:2,fn\nDA:10,2\nend_of_record\n' },
			{ spec: 'B', text: 'TN:B\nSF:f.ts\nFN:10,fn\nFNDA:3,fn\nDA:10,3\nend_of_record\n' },
		]);
		expect(lcov).toContain('FNDA:5,fn');
		expect(lcov).toContain('DA:10,5');
	});
});

describe('resolveImpact', () => {
	const map: ImpactMap = {
		'packages/cli/src/x.ts': { '10': ['spec-a'], '30': ['spec-b'] },
	};

	it('selects only the specs for the function a changed line falls into', () => {
		expect(resolveImpact([{ file: 'packages/cli/src/x.ts', lines: [12] }], map).specs).toEqual([
			'spec-a',
		]);
		expect(resolveImpact([{ file: 'packages/cli/src/x.ts', lines: [35] }], map).specs).toEqual([
			'spec-b',
		]);
	});

	it('selects all of a file’s specs when no lines are given', () => {
		expect(resolveImpact([{ file: 'packages/cli/src/x.ts' }], map).specs).toEqual([
			'spec-a',
			'spec-b',
		]);
	});

	it('treats a change above the first function (top-level) as whole-file', () => {
		const r = resolveImpact([{ file: 'packages/cli/src/x.ts', lines: [1] }], map);
		expect(r.specs).toEqual(['spec-a', 'spec-b']);
	});

	it('forces broad mode for an unmapped file (the safety valve)', () => {
		const r = resolveImpact([{ file: 'packages/new/src/new.ts', lines: [3] }], map, {
			allSpecs: ['spec-a', 'spec-b', 'spec-c'],
		});
		expect(r.mode).toBe('broad');
		expect(r.unmapped).toEqual(['packages/new/src/new.ts']);
		expect(r.specs).toEqual(['spec-a', 'spec-b', 'spec-c']);
	});
});

// ===========================================================================
// Property + metamorphic tests — the soundness guarantee
// ===========================================================================

describe('mergeCoverage — properties', () => {
	it('SOUNDNESS: every executed (spec, function) appears in the map', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const { impactMap } = mergeCoverage(buildInputs(execs));
				for (const e of execs) {
					if (e.hits > 0) {
						expect(impactMap[e.file]?.[String(e.fnLine)] ?? []).toContain(e.spec);
					}
				}
			}),
		);
	});

	it('NO PHANTOMS: a spec is not attributed to a function it only loaded (hits 0)', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const { impactMap } = mergeCoverage(buildInputs(execs));
				for (const e of execs) {
					if (e.hits === 0) {
						// (spec,file,fnLine) is unique per execs, so no hits>0 record revives it.
						expect(impactMap[e.file]?.[String(e.fnLine)] ?? []).not.toContain(e.spec);
					}
				}
			}),
		);
	});

	it('ORDER-INDEPENDENT: merge result does not depend on input order', () => {
		fc.assert(
			fc.property(arbExecs, fc.array(fc.nat(), { maxLength: 40 }), (execs, keys) => {
				const inputs = buildInputs(execs);
				const a = mergeCoverage(inputs);
				const b = mergeCoverage(shuffle(inputs, keys));
				expect(b.impactMap).toEqual(a.impactMap);
				expect(b.lcov).toEqual(a.lcov);
			}),
		);
	});

	it('MONOTONIC: adding coverage never removes a map entry', () => {
		fc.assert(
			fc.property(arbExecs, arbExecs, (a, b) => {
				const mapA = mergeCoverage(buildInputs(a)).impactMap;
				const mapAB = mergeCoverage([...buildInputs(a), ...buildInputs(b)]).impactMap;
				for (const file of Object.keys(mapA)) {
					for (const line of Object.keys(mapA[file])) {
						for (const spec of mapA[file][line]) {
							expect(mapAB[file]?.[line] ?? []).toContain(spec);
						}
					}
				}
			}),
		);
	});

	it('IDEMPOTENT: merging duplicated inputs yields the same map', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const inputs = buildInputs(execs);
				expect(mergeCoverage([...inputs, ...inputs]).impactMap).toEqual(
					mergeCoverage(inputs).impactMap,
				);
			}),
		);
	});
});

describe('resolveImpact — properties', () => {
	it('SOUNDNESS: a change to an executed function selects every spec that ran it', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const { impactMap } = mergeCoverage(buildInputs(execs));
				for (const e of execs) {
					if (e.hits > 0) {
						const r = resolveImpact([{ file: e.file, lines: [e.fnLine] }], impactMap);
						expect(r.specs).toContain(e.spec);
					}
				}
			}),
		);
	});

	it('LINE-PRECISE ⊆ FILE-LEVEL: pinning a line never selects more than the whole file', () => {
		fc.assert(
			fc.property(arbExecs, fc.integer({ min: 1, max: 60 }), (execs, line) => {
				const { impactMap } = mergeCoverage(buildInputs(execs));
				const files = Object.keys(impactMap);
				if (files.length === 0) return;
				const file = files[0];
				const precise = new Set(resolveImpact([{ file, lines: [line] }], impactMap).specs);
				const whole = new Set(resolveImpact([{ file }], impactMap).specs);
				for (const s of precise) expect(whole).toContain(s);
			}),
		);
	});

	it('MONOTONIC: resolving more changed files never selects fewer specs', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const { impactMap } = mergeCoverage(buildInputs(execs));
				const files = Object.keys(impactMap);
				if (files.length < 2) return;
				const a: ChangedFile[] = [{ file: files[0] }];
				const ab: ChangedFile[] = [{ file: files[0] }, { file: files[1] }];
				const specsA = new Set(resolveImpact(a, impactMap).specs);
				const specsAB = new Set(resolveImpact(ab, impactMap).specs);
				for (const s of specsA) expect(specsAB).toContain(s);
			}),
		);
	});

	it('DEFAULT-BROAD: any unmapped changed file forces the full spec set', () => {
		fc.assert(
			fc.property(
				arbExecs,
				fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
				(execs, allSpecs) => {
					const { impactMap } = mergeCoverage(buildInputs(execs));
					const r = resolveImpact([{ file: 'packages/never/covered.ts' }], impactMap, { allSpecs });
					expect(r.mode).toBe('broad');
					for (const s of allSpecs) expect(r.specs).toContain(s);
				},
			),
		);
	});
});
