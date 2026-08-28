/**
 * Coverage impact map — the substrate for E2E test selection.
 *
 * Pure functions (no I/O) so they can be exhaustively unit/property tested:
 *   parseLcov     — lcov text → per-spec coverage records
 *   buildImpactMap — per-spec lcovs → unified lcov + bidirectional impact map
 *   resolveImpact — changed files (± lines) → the E2E specs that must run
 *
 * SOUNDNESS is the contract everything is tested against: the selected set must
 * be a SUPERSET of the truly-affected set. Under-selection silently drops a real
 * regression; over-selection only wastes CI. So resolveImpact errs broad — an
 * unmapped (new/never-covered) file forces the full set, never an empty one.
 *
 * Attribution is keyed on the SPEC that exercised the code (lcov `TN:`), so a
 * git diff resolves straight to the spec files that cover the touched functions.
 */

export interface FileCoverage {
	/** function name → { definition line, summed hit count } */
	fns: Map<string, { line: number; hits: number }>;
	/** source line → summed hit count */
	lines: Map<number, number>;
}

/** file → function-start-line (as string) → specs that executed that function */
export type ImpactMap = Record<string, Record<string, string[]>>;

/**
 * On-disk form of {@link ImpactMap}: spec paths are interned into `specs` and
 * referenced by index. Lossless — {@link decodeImpactMap} reconstructs the
 * ImpactMap exactly. Spec paths repeat across thousands of (file, line) entries,
 * so interning shrinks the artifact ~10x with no loss of the function-level
 * detail that line-precise selection and cross-layer overlap analysis need.
 *
 * Each entry's spec set is stored as **whichever is smaller** (lossless):
 *  - a plain index list `[3, 17]` — cheap when few specs cover the line (sparse), or
 *  - a base64 **bitmask** string `"b:…"` (one bit per spec) — constant size no
 *    matter how many specs, so it wins for "hub" lines covered by most specs.
 * Backend coverage is dense (every spec runs the shared server stack), so hubs
 * would otherwise dominate the artifact. See `scripts/impact-map.md`.
 */
export interface InternedImpactMap {
	specs: string[];
	files: Record<string, Record<string, number[] | string>>;
}

const BITMASK_PREFIX = 'b:';

/** Encode a spec-index set as the cheaper of an index list or a base64 bitmask. */
function encodeSpecSet(indices: number[], specCount: number): number[] | string {
	const maskBytes = Math.ceil(specCount / 8);
	const b64Len = Math.ceil(maskBytes / 3) * 4;
	// +4 ≈ the "b:" prefix and the JSON quotes the string form pays vs the array.
	if (JSON.stringify(indices).length <= b64Len + 4) return indices;
	const bytes = new Uint8Array(maskBytes);
	for (const i of indices) bytes[i >> 3] |= 1 << (i & 7);
	return BITMASK_PREFIX + Buffer.from(bytes).toString('base64');
}

/** Decode an entry (index list or `"b:…"` bitmask) back to spec indices. */
function decodeSpecSet(value: number[] | string): number[] {
	if (typeof value !== 'string') return value;
	const bytes = Buffer.from(value.slice(BITMASK_PREFIX.length), 'base64');
	const out: number[] = [];
	for (let byte = 0; byte < bytes.length; byte++) {
		for (let bit = 0; bit < 8; bit++) {
			if (bytes[byte] & (1 << bit)) out.push(byte * 8 + bit);
		}
	}
	return out;
}

/** One per-spec lcov and the spec it belongs to (used when records carry no `TN:`). */
export interface LcovInput {
	text: string;
	spec: string;
}

export interface MergeResult {
	lcov: string;
	impactMap: ImpactMap;
	stats: { files: number; functions: number; lines: number; specs: number; mapEntries: number };
}

interface LcovRecord {
	spec: string;
	file: string;
	fns: Array<{ name: string; line: number; hits: number }>;
	lines: Array<{ line: number; hits: number }>;
}

/**
 * Parse lcov text into per-spec records. A record's spec is its `TN:` if present
 * and non-empty, else `fallbackSpec`. Supports many `SF:` records per text.
 */
export function parseLcov(text: string, fallbackSpec = ''): LcovRecord[] {
	const records: LcovRecord[] = [];
	let spec = fallbackSpec;
	let current: LcovRecord | null = null;
	const fnLine = new Map<string, number>();
	for (const raw of text.split('\n')) {
		if (raw.startsWith('TN:')) {
			const tn = raw.slice(3).trim();
			spec = tn || fallbackSpec;
		} else if (raw.startsWith('SF:')) {
			fnLine.clear();
			current = { spec, file: raw.slice(3).trim(), fns: [], lines: [] };
		} else if (!current) {
			continue;
		} else if (raw.startsWith('FN:')) {
			const idx = raw.indexOf(',');
			const line = Number(raw.slice(3, idx));
			const name = raw.slice(idx + 1);
			fnLine.set(name, line);
		} else if (raw.startsWith('FNDA:')) {
			const idx = raw.indexOf(',');
			const hits = Number(raw.slice(5, idx));
			const name = raw.slice(idx + 1);
			current.fns.push({ name, line: fnLine.get(name) ?? 0, hits });
		} else if (raw.startsWith('DA:')) {
			const [line, hits] = raw.slice(3).split(',');
			current.lines.push({ line: Number(line), hits: Number(hits) });
		} else if (raw.startsWith('end_of_record')) {
			records.push(current);
			current = null;
		}
	}
	if (current) records.push(current);
	return records;
}

/**
 * Merge per-spec lcovs into one unified lcov + the impact map. Hit counts sum;
 * the map records, per function, the SET of specs that executed it (hits > 0).
 * Output is deterministic (sorted) so the merge is order-independent.
 */
export function buildImpactMap(inputs: LcovInput[]): MergeResult {
	const files = new Map<string, FileCoverage>();
	const funcToSpecs = new Map<string, Set<string>>();
	const allSpecs = new Set<string>();

	const getFile = (sf: string): FileCoverage => {
		let f = files.get(sf);
		if (!f) files.set(sf, (f = { fns: new Map(), lines: new Map() }));
		return f;
	};

	for (const input of inputs) {
		for (const rec of parseLcov(input.text, input.spec)) {
			allSpecs.add(rec.spec);
			const f = getFile(rec.file);
			for (const fn of rec.fns) {
				const cur = f.fns.get(fn.name) ?? { line: fn.line, hits: 0 };
				cur.hits += fn.hits;
				f.fns.set(fn.name, cur);
				if (fn.hits > 0) {
					const key = `${rec.file}#${fn.line}`;
					let specs = funcToSpecs.get(key);
					if (!specs) funcToSpecs.set(key, (specs = new Set()));
					specs.add(rec.spec);
				}
			}
			for (const ln of rec.lines) {
				f.lines.set(ln.line, (f.lines.get(ln.line) ?? 0) + ln.hits);
			}
		}
	}

	return {
		lcov: serializeLcov(files),
		impactMap: assembleImpactMap(funcToSpecs),
		stats: {
			files: files.size,
			functions: [...files.values()].reduce((n, f) => n + f.fns.size, 0),
			lines: [...files.values()].reduce((n, f) => n + f.lines.size, 0),
			specs: allSpecs.size,
			mapEntries: funcToSpecs.size,
		},
	};
}

function serializeLcov(files: Map<string, FileCoverage>): string {
	const out: string[] = [];
	for (const sf of [...files.keys()].sort()) {
		const { fns, lines } = files.get(sf)!;
		out.push('TN:', `SF:${sf}`);
		const fnEntries = [...fns.entries()].sort(
			(a, b) => a[1].line - b[1].line || a[0].localeCompare(b[0]),
		);
		for (const [name, { line }] of fnEntries) out.push(`FN:${line},${name}`);
		let fnh = 0;
		for (const [name, { hits }] of fnEntries) {
			out.push(`FNDA:${hits},${name}`);
			if (hits > 0) fnh++;
		}
		out.push(`FNF:${fns.size}`, `FNH:${fnh}`);
		let lh = 0;
		for (const [line, hits] of [...lines.entries()].sort((a, b) => a[0] - b[0])) {
			out.push(`DA:${line},${hits}`);
			if (hits > 0) lh++;
		}
		out.push(`LF:${lines.size}`, `LH:${lh}`, 'end_of_record');
	}
	return out.join('\n') + (out.length ? '\n' : '');
}

function assembleImpactMap(funcToSpecs: Map<string, Set<string>>): ImpactMap {
	const map: ImpactMap = {};
	for (const [key, specs] of funcToSpecs) {
		const hash = key.lastIndexOf('#');
		const file = key.slice(0, hash);
		const line = key.slice(hash + 1);
		(map[file] ??= {})[line] = [...specs].sort();
	}
	return map;
}

/** Intern spec paths into an index — the lossless on-disk form (see {@link InternedImpactMap}). */
export function encodeImpactMap(map: ImpactMap): InternedImpactMap {
	const index = new Map<string, number>();
	const specs: string[] = [];
	const internSpec = (s: string): number => {
		let i = index.get(s);
		if (i === undefined) index.set(s, (i = specs.push(s) - 1));
		return i;
	};
	// Pass 1: intern every spec so the bitmask width (specs.length) is known
	// before any entry is encoded.
	for (const file of Object.keys(map)) {
		for (const line of Object.keys(map[file])) {
			for (const s of map[file][line]) {
				internSpec(s);
			}
		}
	}
	// Pass 2: store each entry as the cheaper of an index list or a bitmask.
	const files: InternedImpactMap['files'] = {};
	for (const file of Object.keys(map)) {
		files[file] = {};
		for (const line of Object.keys(map[file])) {
			const indices = map[file][line].map((s) => index.get(s)!);
			files[file][line] = encodeSpecSet(indices, specs.length);
		}
	}
	return { specs, files };
}

/**
 * Expand an {@link InternedImpactMap} back to a full {@link ImpactMap}. Handles
 * both entry forms (index list or `"b:…"` bitmask) and older maps that predate
 * the bitmask form (all index lists). Spec lists come back sorted, matching
 * {@link buildImpactMap}'s output, so decode∘encode round-trips exactly.
 */
export function decodeImpactMap(interned: InternedImpactMap): ImpactMap {
	const { specs, files } = interned;
	const map: ImpactMap = {};
	for (const file of Object.keys(files)) {
		map[file] = {};
		for (const line of Object.keys(files[file]))
			map[file][line] = decodeSpecSet(files[file][line])
				.map((i) => specs[i])
				.sort();
	}
	return map;
}

export interface ChangedFile {
	file: string;
	/** Changed source line numbers. Omit for file-level (whole-file) resolution. */
	lines?: number[];
}

export interface ResolveResult {
	/** Specs that must run. In 'broad' mode this is `allSpecs` if supplied. */
	specs: string[];
	/** Changed files with no map entry AND no covered ancestor dir → force broad. */
	unmapped: string[];
	/** Unmapped files resolved to their nearest covered ancestor directory's specs
	 *  (sibling fallback). Scoped, not broad. */
	viaSibling?: string[];
	/** Changed files with no covering spec, under `onUncovered: 'declare'`: the
	 *  change has no E2E that verifies it. NOT run (running unrelated specs would
	 *  be theater) — surfaced as a coverage gap; unit + the sanity spec are the net. */
	uncovered?: string[];
	mode: 'scoped' | 'broad';
}

const parentDir = (p: string): string => {
	const i = p.lastIndexOf('/');
	return i < 0 ? '' : p.slice(0, i);
};

/**
 * Index every ancestor directory of every mapped file to the union of specs
 * under it. Lets an unmapped (new/never-covered) file fall back to the specs
 * that exercise its directory, instead of forcing the whole suite.
 */
function buildDirIndex(map: ImpactMap): Map<string, Set<string>> {
	const dirSpecs = new Map<string, Set<string>>();
	for (const file of Object.keys(map)) {
		const fileSpecs = new Set<string>();
		for (const line of Object.keys(map[file])) for (const s of map[file][line]) fileSpecs.add(s);
		for (let dir = parentDir(file); dir !== ''; dir = parentDir(dir)) {
			let set = dirSpecs.get(dir);
			if (!set) dirSpecs.set(dir, (set = new Set()));
			for (const s of fileSpecs) set.add(s);
		}
	}
	return dirSpecs;
}

/**
 * Resolve changed files to the specs that must run.
 *
 * - A file in the map with changed `lines` → specs for the functions those lines
 *   fall into (a line belongs to the function with the greatest start ≤ line).
 *   Lines above the first function (imports / module top-level) can't be pinned
 *   to one function, so they conservatively select ALL specs covering the file.
 * - A file in the map without `lines` → all specs covering the file.
 * - A file NOT in the map → `unmapped` → mode 'broad' (run everything). This is
 *   the safety valve that keeps selection sound for new/never-covered code.
 *
 * SEAM CONTRACT (line precision): the map only records EXECUTED functions, so it
 * cannot see an un-executed function sitting between two covered ones. A changed
 * line inside such a gap is attributed to the nearest preceding covered function
 * — which can UNDER-SELECT if that region is in truth covered by other specs not
 * in this (possibly partial/stale) map. Line precision is therefore sound only
 * when the map is known function-complete for the file. The default-safe usage —
 * and what the CLI does — is FILE-LEVEL (omit `lines`): a changed file selects
 * every spec covering any part of it. Treat `lines` as an opt-in optimisation.
 *
 * SIBLING FALLBACK (`opts.siblingFallback`): an unmapped file (new / never-
 * covered) otherwise forces 'broad' — counterintuitive for a new file in a
 * well-covered area ("no spec touches this exact path, so run all of them").
 * With it on, the file instead selects the specs covering its NEAREST covered
 * ancestor directory (e.g. a new `@n8n/instance-ai/…` file → the instance-ai
 * specs). Only a file with NO covered ancestor at all still forces broad.
 * Deliberate trade: a new file is assumed exercised by the specs that exercise
 * its directory — a sound superset in practice, far cheaper than the whole suite.
 *
 * UNCOVERED (`opts.onUncovered`): what to do with a file that has no direct map
 * entry (and no sibling ancestor). `'broad'` (default) forces the whole suite —
 * the original fail-open. `'declare'` instead records it in `uncovered` and
 * selects nothing for it: if no spec exercises the change, running unrelated
 * specs verifies nothing (theater) and only slows the loop. The change is still
 * covered by its unit tests + the always-on sanity spec; the gap is surfaced.
 * Reserve `'broad'` for genuine fail-open (an unusable map) — the caller decides.
 */
export function resolveImpact(
	changed: ChangedFile[],
	map: ImpactMap,
	opts: { allSpecs?: string[]; siblingFallback?: boolean; onUncovered?: 'broad' | 'declare' } = {},
): ResolveResult {
	const specs = new Set<string>();
	const unmapped: string[] = [];
	const viaSibling: string[] = [];
	const uncovered: string[] = [];
	const declare = opts.onUncovered === 'declare';
	const dirIndex = opts.siblingFallback && !declare ? buildDirIndex(map) : undefined;

	for (const { file, lines } of changed) {
		const fileMap = map[file];
		if (!fileMap) {
			if (declare) {
				// No spec covers this change → don't run theater; surface the gap.
				uncovered.push(file);
				continue;
			}
			if (dirIndex) {
				let resolved: Set<string> | undefined;
				for (let dir = parentDir(file); dir !== '' && !resolved; dir = parentDir(dir)) {
					const set = dirIndex.get(dir);
					if (set?.size) resolved = set;
				}
				if (resolved) {
					for (const s of resolved) specs.add(s);
					viaSibling.push(file);
					continue;
				}
			}
			unmapped.push(file);
			continue;
		}
		const fnStarts = Object.keys(fileMap)
			.map(Number)
			.sort((a, b) => a - b);
		const addFile = () => {
			for (const fnLine of fnStarts) for (const s of fileMap[String(fnLine)]) specs.add(s);
		};
		if (!lines || lines.length === 0) {
			addFile();
			continue;
		}
		for (const line of lines) {
			// The function containing `line` is the one with the greatest start ≤ line.
			let owner = -1;
			for (const start of fnStarts) {
				if (start <= line) owner = start;
				else break;
			}
			if (owner === -1) {
				// Above the first function (top-level/import change) → whole file.
				addFile();
				break;
			}
			for (const s of fileMap[String(owner)]) specs.add(s);
		}
	}

	const mode = unmapped.length > 0 ? 'broad' : 'scoped';
	if (mode === 'broad' && opts.allSpecs) {
		for (const s of opts.allSpecs) specs.add(s);
	}
	return {
		specs: [...specs].sort(),
		unmapped,
		...(viaSibling.length ? { viaSibling } : {}),
		...(uncovered.length ? { uncovered } : {}),
		mode,
	};
}
