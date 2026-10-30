import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { resolveImpact } from './impact-map.js';
import {
	changedSpans,
	parseHunks,
	resolveSpans,
	translateSpans,
	type DiffHunk,
	type FunctionRange,
} from './line-scope.js';

describe('parseHunks', () => {
	it('reads hunk headers and treats a missing count as 1', () => {
		expect(
			parseHunks('diff --git a/f b/f\n@@ -3 +3,2 @@ ctx\n-a\n+b\n+c\n@@ -10,0 +12 @@\n+d'),
		).toEqual([
			{ oldStart: 3, oldCount: 1, newStart: 3, newCount: 2 },
			{ oldStart: 10, oldCount: 0, newStart: 12, newCount: 1 },
		]);
	});
});

describe('changedSpans', () => {
	it('keeps replaced lines and spans both neighbours of an insertion', () => {
		expect(
			changedSpans([
				{ oldStart: 4, oldCount: 2, newStart: 4, newCount: 1 },
				{ oldStart: 9, oldCount: 0, newStart: 9, newCount: 3 },
			]),
		).toEqual([
			{ lo: 4, hi: 5 },
			{ lo: 9, hi: 10 },
		]);
	});
});

describe('translateSpans', () => {
	// An edit replaces `oldCount` old lines at `at` (0-based) with `newCount` new lines.
	type Edit = { at: number; oldCount: number; newCount: number };

	/** Apply edits to lines 1..n, returning the new file (old line number or null
	 *  for an inserted line) and the hunks git would print for old → new. */
	function applyEdits(n: number, edits: Edit[]): { next: Array<number | null>; hunks: DiffHunk[] } {
		const next: Array<number | null> = [];
		const hunks: DiffHunk[] = [];
		let cursor = 0;
		for (const { at, oldCount, newCount } of edits) {
			while (cursor < at) next.push(++cursor);
			// git numbers an empty side by the line before the gap.
			hunks.push({
				oldStart: oldCount > 0 ? at + 1 : at,
				oldCount,
				newStart: newCount > 0 ? next.length + 1 : next.length,
				newCount,
			});
			for (let i = 0; i < newCount; i++) next.push(null);
			cursor += oldCount;
		}
		while (cursor < n) next.push(++cursor);
		return { next, hunks };
	}

	const editsArb = fc.integer({ min: 1, max: 40 }).chain((n) =>
		fc
			.uniqueArray(fc.integer({ min: 0, max: n - 1 }), { maxLength: 6 })
			.chain((starts) =>
				fc.tuple(
					fc.constant(n),
					fc.tuple(
						...[...starts]
							.sort((a, b) => a - b)
							.map((at) =>
								fc.record({
									at: fc.constant(at),
									oldCount: fc.integer({ min: 0, max: 3 }),
									newCount: fc.integer({ min: 0, max: 3 }),
								}),
							),
					),
				),
			)
			.map(([size, raw]) => {
				// Drop no-op and overlapping edits so the hunks are valid.
				const edits: Edit[] = [];
				let end = 0;
				for (const e of raw) {
					const oldCount = Math.min(e.oldCount, size - e.at);
					if (e.at < end || oldCount + e.newCount === 0) continue;
					edits.push({ ...e, oldCount });
					end = e.at + Math.max(oldCount, 1);
				}
				return { n: size, edits };
			}),
	);

	it('maps every unchanged line back to its old line, and no changed line', () => {
		fc.assert(
			fc.property(editsArb, ({ n, edits }) => {
				const { next, hunks } = applyEdits(n, edits);
				next.forEach((old, i) => {
					const span = translateSpans([{ lo: i + 1, hi: i + 1 }], hunks);
					expect(span).toEqual(old === null ? null : [{ lo: old, hi: old }]);
				});
			}),
		);
	});
});

describe('resolveSpans', () => {
	// outer: lines 1-20, with a callback on lines 5-8; other: 22-30 (no spec ran it).
	const ranges: FunctionRange[] = [
		{ start: 1, end: 20 },
		{ start: 5, end: 8 },
		{ start: 22, end: 30 },
	];
	const fileMap = { '1': ['outer.spec'], '5': ['callback.spec'], '22': [] };

	it('gives a line after a nested callback to the outer function', () => {
		expect(resolveSpans(fileMap, ranges, [{ lo: 12, hi: 12 }])).toEqual([
			'callback.spec',
			'outer.spec',
		]);
	});

	it('gives a line in the callback to the callback only', () => {
		expect(resolveSpans(fileMap, ranges, [{ lo: 6, hi: 7 }])).toEqual(['callback.spec']);
	});

	it('selects nothing for a function that no spec ran', () => {
		expect(resolveSpans(fileMap, ranges, [{ lo: 25, hi: 25 }])).toEqual([]);
	});

	it('falls back to the file for module-level lines and insertions between functions', () => {
		expect(resolveSpans(fileMap, ranges, [{ lo: 21, hi: 21 }])).toBeNull();
		expect(resolveSpans(fileMap, ranges, [{ lo: 20, hi: 21 }])).toBeNull();
	});

	it('falls back to the file when the map has no entry at the function start', () => {
		expect(resolveSpans({ '2': ['outer.spec'] }, ranges, [{ lo: 12, hi: 12 }])).toBeNull();
	});
});

describe('resolveImpact with a scope', () => {
	const map = { 'f.ts': { '1': ['a.spec'], '10': ['b.spec'], '20': [] } };
	const ranges = [
		{ start: 1, end: 8 },
		{ start: 10, end: 18 },
		{ start: 20, end: 25 },
	];

	it('selects the specs of the changed function only', () => {
		const result = resolveImpact(
			[{ file: 'f.ts', scope: { spans: [{ lo: 12, hi: 12 }], ranges } }],
			map,
			{ onUncovered: 'declare' },
		);
		expect(result.specs).toEqual(['b.spec']);
	});

	it('reports a change to an unrun function as uncovered', () => {
		const result = resolveImpact(
			[{ file: 'f.ts', scope: { spans: [{ lo: 22, hi: 22 }], ranges } }],
			map,
			{ onUncovered: 'declare' },
		);
		expect(result).toMatchObject({ specs: [], uncovered: ['f.ts'] });
	});

	it('selects the whole file when the scope cannot resolve', () => {
		const result = resolveImpact(
			[{ file: 'f.ts', scope: { spans: [{ lo: 9, hi: 9 }], ranges } }],
			map,
			{ onUncovered: 'declare' },
		);
		expect(result.specs).toEqual(['a.spec', 'b.spec']);
	});
});
