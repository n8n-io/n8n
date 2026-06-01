/**
 * Coverage impact map — the substrate for E2E test selection.
 *
 * Pure functions (no I/O) so they can be exhaustively unit/property tested:
 *   parseLcov     — lcov text → per-spec coverage records
 *   mergeCoverage — per-spec lcovs → unified lcov + bidirectional impact map
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
export function mergeCoverage(inputs: LcovInput[]): MergeResult {
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
		impactMap: buildImpactMap(funcToSpecs),
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

function buildImpactMap(funcToSpecs: Map<string, Set<string>>): ImpactMap {
	const map: ImpactMap = {};
	for (const [key, specs] of funcToSpecs) {
		const hash = key.lastIndexOf('#');
		const file = key.slice(0, hash);
		const line = key.slice(hash + 1);
		(map[file] ??= {})[line] = [...specs].sort();
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
	/** Changed files absent from the map (new/renamed/never-covered) → force broad. */
	unmapped: string[];
	mode: 'scoped' | 'broad';
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
 */
export function resolveImpact(
	changed: ChangedFile[],
	map: ImpactMap,
	opts: { allSpecs?: string[] } = {},
): ResolveResult {
	const specs = new Set<string>();
	const unmapped: string[] = [];

	for (const { file, lines } of changed) {
		const fileMap = map[file];
		if (!fileMap) {
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
	return { specs: [...specs].sort(), unmapped, mode };
}
