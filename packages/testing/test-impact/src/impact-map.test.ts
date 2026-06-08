import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
	type ChangedFile,
	type ImpactMap,
	type LcovInput,
	decodeImpactMap,
	encodeImpactMap,
	buildImpactMap,
	parseLcov,
	resolveImpact,
} from './impact-map.js';

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

describe('buildImpactMap', () => {
	it('attributes a function to every spec that executed it (hits > 0)', () => {
		const { impactMap } = buildImpactMap([
			{ spec: 'A', text: 'TN:A\nSF:f.ts\nFN:10,fn\nFNDA:2,fn\nend_of_record\n' },
			{ spec: 'B', text: 'TN:B\nSF:f.ts\nFN:10,fn\nFNDA:1,fn\nend_of_record\n' },
		]);
		expect(impactMap['f.ts']['10']).toEqual(['A', 'B']);
	});

	it('excludes load-only functions (hits === 0) from the map', () => {
		const { impactMap } = buildImpactMap([
			{
				spec: 'A',
				text: 'TN:A\nSF:f.ts\nFN:10,hit\nFN:20,loaded\nFNDA:4,hit\nFNDA:0,loaded\nend_of_record\n',
			},
		]);
		expect(impactMap['f.ts']['10']).toEqual(['A']);
		expect(impactMap['f.ts']['20']).toBeUndefined();
	});

	it('sums hit counts across specs in the unified lcov', () => {
		const { lcov } = buildImpactMap([
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

describe('resolveImpact — sibling fallback', () => {
	const m: ImpactMap = {
		'packages/cli/src/a.ts': { '1': ['s1'] },
		'packages/cli/src/sub/b.ts': { '1': ['s2'] },
		'packages/core/src/c.ts': { '1': ['s3'] },
	};
	const sib = { siblingFallback: true, allSpecs: ['s1', 's2', 's3'] };

	it('resolves a new file to its nearest covered directory (not broad)', () => {
		const r = resolveImpact([{ file: 'packages/cli/src/e.ts' }], m, sib);
		expect(r.mode).toBe('scoped');
		expect(r.viaSibling).toEqual(['packages/cli/src/e.ts']);
		expect(r.specs).toEqual(['s1', 's2']); // union of packages/cli/src
		expect(r.unmapped).toEqual([]);
	});

	it('prefers the DEEPEST covered directory', () => {
		const r = resolveImpact([{ file: 'packages/cli/src/sub/d.ts' }], m, sib);
		expect(r.specs).toEqual(['s2']); // only sub/, not all of cli/src
	});

	it('still forces broad when NO ancestor directory is covered', () => {
		const r = resolveImpact([{ file: 'scripts/tool.mjs' }], m, sib);
		expect(r.mode).toBe('broad');
		expect(r.unmapped).toEqual(['scripts/tool.mjs']);
		expect(r.specs).toEqual(['s1', 's2', 's3']);
	});

	it('is off by default — unmapped still forces broad', () => {
		const r = resolveImpact([{ file: 'packages/cli/src/e.ts' }], m, {
			allSpecs: ['s1', 's2', 's3'],
		});
		expect(r.mode).toBe('broad');
	});

	it('PROPERTY: safe — never selects outside allSpecs, partitions files cleanly', () => {
		const allSpecs = ['s0', 's1', 's2', 's3', 's4', 's5'];
		const name = fc.constantFrom('a', 'b', 'c', 'd', 'e');
		const mDir = fc.constantFrom('pkg/x/src', 'pkg/x/src/sub', 'pkg/y/src');
		const cDir = fc.constantFrom('pkg/x/src', 'pkg/x/src/sub', 'pkg/y/src', 'pkg/z/src', 'scripts');
		fc.assert(
			fc.property(
				fc.array(
					fc.record({ dir: mDir, name, idx: fc.uniqueArray(fc.nat({ max: 5 }), { minLength: 1 }) }),
					{ minLength: 1, maxLength: 6 },
				),
				fc.array(fc.record({ dir: cDir, name }), { minLength: 1, maxLength: 5 }),
				(mapped, changed) => {
					const map: ImpactMap = {};
					for (const x of mapped)
						map[`${x.dir}/${x.name}.ts`] = { '1': x.idx.map((i) => allSpecs[i]).sort() };
					const cf = changed.map((c) => ({ file: `${c.dir}/${c.name}.new.ts` }));
					const r = resolveImpact(cf, map, { allSpecs, siblingFallback: true });
					// safety: only ever selects real specs
					for (const s of r.specs) expect(allSpecs).toContain(s);
					// a file is resolved (mapped/sibling) XOR unmapped — never both
					const via = new Set(r.viaSibling ?? []);
					for (const f of r.unmapped) expect(via.has(f)).toBe(false);
					// scoped ⟺ nothing fell through to unmapped
					expect(r.mode === 'scoped').toBe(r.unmapped.length === 0);
				},
			),
		);
	});
});

// ===========================================================================
// Property + metamorphic tests — the soundness guarantee
// ===========================================================================

describe('buildImpactMap — properties', () => {
	it('SOUNDNESS: every executed (spec, function) appears in the map', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const { impactMap } = buildImpactMap(buildInputs(execs));
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
				const { impactMap } = buildImpactMap(buildInputs(execs));
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
				const a = buildImpactMap(inputs);
				const b = buildImpactMap(shuffle(inputs, keys));
				expect(b.impactMap).toEqual(a.impactMap);
				expect(b.lcov).toEqual(a.lcov);
			}),
		);
	});

	it('MONOTONIC: adding coverage never removes a map entry', () => {
		fc.assert(
			fc.property(arbExecs, arbExecs, (a, b) => {
				const mapA = buildImpactMap(buildInputs(a)).impactMap;
				const mapAB = buildImpactMap([...buildInputs(a), ...buildInputs(b)]).impactMap;
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
				expect(buildImpactMap([...inputs, ...inputs]).impactMap).toEqual(
					buildImpactMap(inputs).impactMap,
				);
			}),
		);
	});
});

describe('resolveImpact — properties', () => {
	it('SOUNDNESS: a change to an executed function selects every spec that ran it', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const { impactMap } = buildImpactMap(buildInputs(execs));
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
				const { impactMap } = buildImpactMap(buildInputs(execs));
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
				const { impactMap } = buildImpactMap(buildInputs(execs));
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
					const { impactMap } = buildImpactMap(buildInputs(execs));
					const r = resolveImpact([{ file: 'packages/never/covered.ts' }], impactMap, { allSpecs });
					expect(r.mode).toBe('broad');
					for (const s of allSpecs) expect(r.specs).toContain(s);
				},
			),
		);
	});

	it('R9: lines:[] (empty array) resolves to whole-file, not empty', () => {
		const map: ImpactMap = { 'f.ts': { '10': ['A'], '20': ['B'] } };
		// Distinct from undefined; must not silently select nothing (under-selection).
		expect(resolveImpact([{ file: 'f.ts', lines: [] }], map).specs).toEqual(['A', 'B']);
	});
});

// ===========================================================================
// Serializer + parser hardening — the serializer is exercised by every merge
// but the algebra properties use buildImpactMap as their own oracle, so a
// wrong-but-deterministic serialization slips through. These pin it externally.
// ===========================================================================

describe('serializeLcov (via buildImpactMap.lcov)', () => {
	it('SERIALIZE-CORRECT: parse∘serialize round-trips FN/FNDA/DA hits', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				// Expected summed hits per (file, line) from the ground truth.
				const expected = new Map<string, Map<number, number>>();
				for (const e of execs) {
					const f = expected.get(e.file) ?? new Map<number, number>();
					expected.set(e.file, f);
					f.set(e.fnLine, (f.get(e.fnLine) ?? 0) + e.hits);
				}
				const { lcov } = buildImpactMap(buildInputs(execs));
				for (const rec of parseLcov(lcov)) {
					const exp = expected.get(rec.file);
					if (!exp) continue;
					for (const fn of rec.fns) expect(fn.hits).toBe(exp.get(fn.line) ?? 0);
					for (const ln of rec.lines) expect(ln.hits).toBe(exp.get(ln.line) ?? 0);
				}
			}),
		);
	});

	it('emits FN/DA sorted by line and correct FNF/FNH/LF/LH', () => {
		const { lcov } = buildImpactMap([
			{
				spec: 'A',
				text: 'TN:A\nSF:f.ts\nFN:30,c\nFN:10,a\nFN:20,b\nFNDA:0,c\nFNDA:5,a\nFNDA:2,b\nDA:30,0\nDA:10,5\nDA:20,2\nend_of_record\n',
			},
		]);
		const lines = lcov.split('\n');
		// Sort order is asserted externally — the order-independence property can't
		// catch a wrong comparator (it compares the serializer against itself).
		expect(lines.filter((l) => l.startsWith('FN:'))).toEqual(['FN:10,a', 'FN:20,b', 'FN:30,c']);
		expect(lines.filter((l) => l.startsWith('DA:'))).toEqual(['DA:10,5', 'DA:20,2', 'DA:30,0']);
		expect(lcov).toContain('FNF:3'); // 3 functions found
		expect(lcov).toContain('FNH:2'); // 2 hit (a,b; c has 0)
		expect(lcov).toContain('LF:3');
		expect(lcov).toContain('LH:2');
	});
});

describe('encode/decode impact map (interned on-disk form)', () => {
	it('LOSSLESS: decode∘encode round-trips any impact map', () => {
		fc.assert(
			fc.property(arbExecs, (execs) => {
				const { impactMap } = buildImpactMap(buildInputs(execs));
				expect(decodeImpactMap(encodeImpactMap(impactMap))).toEqual(impactMap);
			}),
		);
	});

	it('interns each spec path exactly once', () => {
		const { impactMap } = buildImpactMap([
			{ spec: 'A', text: 'TN:A\nSF:f.ts\nFN:10,a\nFN:20,b\nFNDA:1,a\nFNDA:1,b\nend_of_record\n' },
		]);
		const enc = encodeImpactMap(impactMap);
		expect(enc.specs).toEqual(['A']); // one entry despite two functions
		expect(enc.files['f.ts']['10']).toEqual([0]); // sparse → index list
		expect(enc.files['f.ts']['20']).toEqual([0]);
	});

	it('SPARSE entries stay index lists; DENSE entries become bitmasks', () => {
		const specs = Array.from({ length: 40 }, (_, i) => `spec-${i}.ts`).sort();
		const map = { 'f.ts': { '5': ['spec-0.ts', 'spec-1.ts'], '10': specs } };
		const enc = encodeImpactMap(map);
		expect(Array.isArray(enc.files['f.ts']['5'])).toBe(true); // 2 specs → list
		expect(typeof enc.files['f.ts']['10']).toBe('string'); // 40 specs → bitmask
		expect(enc.files['f.ts']['10']).toMatch(/^b:/);
		// Lossless either way.
		expect(decodeImpactMap(enc)).toEqual(map);
	});

	it('LOSSLESS through the bitmask branch for a fully-covered (hub) line', () => {
		const specs = Array.from({ length: 100 }, (_, i) => `s${i}.spec.ts`).sort();
		const map = { 'hub.ts': { '1': specs } };
		const enc = encodeImpactMap(map);
		expect(enc.files['hub.ts']['1']).toMatch(/^b:/);
		expect(decodeImpactMap(enc)).toEqual(map);
	});

	it('BACKWARD-COMPAT: decodes a pre-bitmask map (all index lists)', () => {
		const old = { specs: ['A', 'B'], files: { 'f.ts': { '1': [0, 1], '2': [1] } } };
		expect(decodeImpactMap(old)).toEqual({ 'f.ts': { '1': ['A', 'B'], '2': ['B'] } });
	});

	// The arbExecs property above caps at 5 specs (single-byte masks, indices
	// 0-4). This drives a WIDE spec universe + SCATTERED subsets so the bitmask
	// bit-packing (i>>3 across multiple bytes), the list/bitmask threshold, and
	// the full hub case are all round-tripped.
	it('LOSSLESS: round-trips wide spec universes + scattered subsets through both encodings', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 200 }),
				fc.array(fc.array(fc.nat({ max: 1000 }), { minLength: 1, maxLength: 200 }), {
					minLength: 1,
					maxLength: 8,
				}),
				(n, rawEntries) => {
					const specs = Array.from(
						{ length: n },
						(_, i) => `tests/e2e/s${String(i).padStart(3, '0')}.spec.ts`,
					);
					const map: ImpactMap = {};
					// A hub line covering ALL specs pins specs.length = n (forces
					// multi-byte masks) and exercises the fully-covered bitmask.
					map['hub.ts'] = { '1': [...specs].sort() };
					rawEntries.forEach((idxs, k) => {
						const set = [...new Set(idxs.map((i) => i % n))].map((i) => specs[i]).sort();
						if (set.length) map[`f${k}.ts`] = { '1': set };
					});
					expect(decodeImpactMap(encodeImpactMap(map))).toEqual(map);
				},
			),
		);
	});
});

describe('parseLcov hardening', () => {
	it('P5: never throws on arbitrary or malformed text', () => {
		fc.assert(
			fc.property(fc.string(), (text) => {
				parseLcov(text); // must not throw
			}),
		);
		fc.assert(
			fc.property(
				fc.array(
					fc.constantFrom(
						'TN:',
						'TN:x',
						'SF:f.ts',
						'FN:bad',
						'FN:1,n',
						'FNDA:',
						'FNDA:x,n',
						'DA:',
						'DA:,',
						'end_of_record',
						'',
						'noise',
					),
					{ maxLength: 40 },
				),
				(lines) => {
					parseLcov(lines.join('\n'));
				},
			),
		);
	});

	it('P4: FNDA without a matching FN → line 0, and fnLine resets per SF (no bleed)', () => {
		const recs = parseLcov(
			'SF:a.ts\nFN:5,shared\nFNDA:1,shared\nend_of_record\nSF:b.ts\nFNDA:2,shared\nend_of_record\n',
		);
		const b = recs.find((r) => r.file === 'b.ts')!;
		// `shared` is at line 5 in a.ts; b.ts has no FN for it → line 0, not 5.
		expect(b.fns).toEqual([{ name: 'shared', line: 0, hits: 2 }]);
	});
});
