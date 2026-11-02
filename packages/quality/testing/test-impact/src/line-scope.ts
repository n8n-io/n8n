/**
 * Line-level scoping for coverage-map selection.
 *
 * A file-level change selects every spec that ran any function in the file. A
 * line-level change selects only the specs that ran the function that contains
 * the changed lines. Pure functions only: the caller reads the git diffs and
 * parses the function ranges.
 *
 * Three facts make this sound, and each fails safe to file-level:
 *
 * - The map keys each function by its start line in the commit that the map was
 *   built from. The caller translates the changed lines of the base commit to
 *   that commit with {@link translateSpans}. A line inside code that changed
 *   between the two commits cannot be translated.
 * - lcov records only where a function starts. {@link resolveSpans} uses the
 *   parsed function ranges to find the innermost function that contains a
 *   change, so a line after a nested callback belongs to the outer function.
 * - The map keeps functions that no spec ran, with an empty spec list. A
 *   function with no map entry at its start line means the map and the parse
 *   disagree, so the file falls back to file-level.
 */

/** Lines of one function, 1-based and inclusive. `start` excludes decorators. */
export interface FunctionRange {
	start: number;
	end: number;
}

/** Changed lines, 1-based and inclusive. A pure insertion after line `a` is `[a, a + 1]`. */
export interface LineSpan {
	lo: number;
	hi: number;
}

/** The changed spans of one file and its function ranges, in the map commit's lines. */
export interface LineScope {
	spans: LineSpan[];
	ranges: FunctionRange[];
}

/** One `@@ -oldStart,oldCount +newStart,newCount @@` hunk of a unified diff. */
export interface DiffHunk {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/** Read the hunk headers of a unified diff. A missing count means 1. */
export function parseHunks(diff: string): DiffHunk[] {
	const hunks: DiffHunk[] = [];
	for (const line of diff.split('\n')) {
		const m = HUNK_HEADER.exec(line);
		if (!m) continue;
		hunks.push({
			oldStart: Number(m[1]),
			oldCount: m[2] === undefined ? 1 : Number(m[2]),
			newStart: Number(m[3]),
			newCount: m[4] === undefined ? 1 : Number(m[4]),
		});
	}
	return hunks;
}

/**
 * The old-side lines that a diff changes. Removed or replaced lines are a span
 * of old lines. A pure insertion after old line `a` is the span `[a, a + 1]`, so
 * only a function that contains both neighbours can own the new code.
 */
export function changedSpans(hunks: DiffHunk[]): LineSpan[] {
	return hunks.map(({ oldStart, oldCount }) =>
		oldCount > 0
			? { lo: oldStart, hi: oldStart + oldCount - 1 }
			: { lo: oldStart, hi: oldStart + 1 },
	);
}

/**
 * Translate one line from the new side of `hunks` to the old side. Returns null
 * when the line is inside a hunk, because the old side has no matching line.
 */
function translateLine(line: number, hunks: DiffHunk[]): number | null {
	let offset = 0;
	for (const h of hunks) {
		if (h.newCount > 0) {
			const last = h.newStart + h.newCount - 1;
			if (line >= h.newStart && line <= last) return null;
			if (last < line) offset += h.oldCount - h.newCount;
		} else if (h.newStart < line) {
			// A pure deletion sits after new line `newStart`.
			offset += h.oldCount;
		}
	}
	return line + offset;
}

/**
 * Translate spans from the base commit to the map commit. `hunks` come from
 * `git diff <map-commit> <base> -- <file>`, so the new side is the base. Returns
 * null when any span touches a line that changed between the two commits.
 */
export function translateSpans(spans: LineSpan[], hunks: DiffHunk[]): LineSpan[] | null {
	const out: LineSpan[] = [];
	for (const { lo, hi } of spans) {
		const from = translateLine(lo, hunks);
		const to = translateLine(hi, hunks);
		if (from === null || to === null) return null;
		out.push({ lo: from, hi: to });
	}
	return out;
}

/** How the changed spans of one file resolve. */
export interface SpanResolution {
	/** The specs that ran the functions that contain the spans. */
	specs: string[];
	/** A span is outside every function: module-level code, or an insertion between functions. */
	moduleLevel: boolean;
}

/**
 * Resolve the changed spans of one file, or return null to fall back to the
 * whole file. A span resolves to the innermost function that contains all of
 * it. The specs are the union of the specs that ran that function or a function
 * nested in it. A nested function can run in a spec in which its parent did not
 * run, for example a callback that is stored and called later.
 *
 * A span outside every function sets `moduleLevel`: module-level code runs on
 * import, which the map does not record per function. Falls back (null) when
 * the map has no entry at the function's start line.
 */
export function resolveSpans(
	fileMap: Record<string, string[]>,
	ranges: FunctionRange[],
	spans: LineSpan[],
): SpanResolution | null {
	const entries = Object.keys(fileMap).map((line) => ({
		line: Number(line),
		specs: fileMap[line],
	}));
	const specs = new Set<string>();
	let moduleLevel = false;
	for (const { lo, hi } of spans) {
		let owner: FunctionRange | undefined;
		for (const r of ranges) {
			if (r.start > lo || r.end < hi) continue;
			if (!owner || r.end - r.start < owner.end - owner.start) owner = r;
		}
		if (!owner) {
			moduleLevel = true;
			continue;
		}
		if (!fileMap[String(owner.start)]) return null;
		for (const e of entries) {
			if (e.line < owner.start || e.line > owner.end) continue;
			for (const s of e.specs) specs.add(s);
		}
	}
	return { specs: [...specs].sort(), moduleLevel };
}
