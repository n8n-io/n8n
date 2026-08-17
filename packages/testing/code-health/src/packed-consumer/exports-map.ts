/**
 * Reading of a package's `exports` map, kept pure so the probe surface is derived from the
 * manifest rather than from a list somebody has to remember to extend. A subpath added to
 * `exports` is covered by the next run with no edit here.
 */

export type TargetKind = 'module' | 'types' | 'style' | 'manifest' | 'unknown';

export interface ExportTarget {
	/** The `exports` condition this target sits under (`import`, `types`, or `default`). */
	condition: string;
	/** Package-relative target, e.g. `./dist/icons/lucide/index.js`. */
	target: string;
	kind: TargetKind;
}

export interface ExportEntry {
	/** The `exports` key, e.g. `.`, `./icons/lucide`, `./css/*`. */
	subpath: string;
	/**
	 * The bare specifier a consumer writes. Absent for wildcard keys: `./css/*` has no single
	 * specifier, so it is only ever checked through a specifier a real consumer imports.
	 */
	specifier?: string;
	targets: ExportTarget[];
	isWildcard: boolean;
}

export function classifyTarget(target: string): TargetKind {
	if (target.endsWith('package.json')) return 'manifest';
	if (/\.d\.[cm]?ts$/.test(target)) return 'types';
	if (/\.[cm]?js$/.test(target)) return 'module';
	if (/\.(css|scss|sass)$/.test(target)) return 'style';
	// A wildcard target (`./dist/css/*`) carries no extension of its own — the specifier supplies it.
	if (target.includes('*')) return 'unknown';
	return 'unknown';
}

/** The conditions that decide what a consumer actually loads; `require` is absent by design (ESM-only). */
const PROBED_CONDITIONS = ['types', 'import', 'default'];

function targetsOf(value: unknown): ExportTarget[] {
	if (typeof value === 'string') {
		return [{ condition: 'default', target: value, kind: classifyTarget(value) }];
	}
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
	const out: ExportTarget[] = [];
	for (const condition of PROBED_CONDITIONS) {
		const nested = (value as Record<string, unknown>)[condition];
		if (typeof nested === 'string') {
			out.push({ condition, target: nested, kind: classifyTarget(nested) });
		}
	}
	return out;
}

/**
 * Flatten an `exports` field into one entry per subpath key.
 *
 * A missing or string-valued `exports` yields the single root entry, which is what an older
 * manifest looks like — the caller then still has one thing to probe rather than zero, so a
 * regression that erases the map fails loudly instead of passing with an empty target set.
 */
export function collectExportEntries(pkgName: string, exportsField: unknown): ExportEntry[] {
	if (typeof exportsField === 'string') {
		return [
			{
				subpath: '.',
				specifier: pkgName,
				targets: targetsOf(exportsField),
				isWildcard: false,
			},
		];
	}
	if (exportsField === null || typeof exportsField !== 'object' || Array.isArray(exportsField)) {
		return [];
	}

	const entries: ExportEntry[] = [];
	for (const [subpath, value] of Object.entries(exportsField as Record<string, unknown>)) {
		// A bare condition map (`{ "import": "./x.js" }`) with no `./`-prefixed keys is the root.
		const isSubpathKey = subpath === '.' || subpath.startsWith('./');
		if (!isSubpathKey) continue;
		const isWildcard = subpath.includes('*');
		entries.push({
			subpath,
			specifier: isWildcard
				? undefined
				: subpath === '.'
					? pkgName
					: `${pkgName}/${subpath.slice('./'.length)}`,
			targets: targetsOf(value),
			isWildcard,
		});
	}
	return entries;
}

export interface SpecifierMatch {
	entry: ExportEntry;
	/** Targets with `*` substituted by the specifier's captured segment. */
	targets: ExportTarget[];
}

/**
 * Resolve a bare specifier against a package's export entries, the way Node does: an exact key
 * wins, otherwise the wildcard key with the longest static prefix wins.
 *
 * Returns `null` when nothing matches — which is the finding this whole check exists to surface,
 * since such a specifier only ever worked through a build-time alias.
 */
export function resolveSpecifier(
	pkgName: string,
	specifier: string,
	entries: ExportEntry[],
): SpecifierMatch | null {
	const subpath =
		specifier === pkgName
			? '.'
			: specifier.startsWith(`${pkgName}/`)
				? `./${specifier.slice(pkgName.length + 1)}`
				: null;
	if (subpath === null) return null;

	const exact = entries.find((e) => !e.isWildcard && e.subpath === subpath);
	if (exact) return { entry: exact, targets: exact.targets };

	let best: { entry: ExportEntry; captured: string; prefixLength: number } | null = null;
	for (const entry of entries) {
		if (!entry.isWildcard) continue;
		const starIndex = entry.subpath.indexOf('*');
		const prefix = entry.subpath.slice(0, starIndex);
		const suffix = entry.subpath.slice(starIndex + 1);
		if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
		if (subpath.length < prefix.length + suffix.length) continue;
		const captured = subpath.slice(prefix.length, subpath.length - suffix.length);
		if (!best || prefix.length > best.prefixLength) {
			best = { entry, captured, prefixLength: prefix.length };
		}
	}
	if (!best) return null;

	const captured = best.captured;
	return {
		entry: best.entry,
		targets: best.entry.targets.map((t) => ({
			...t,
			target: t.target.replace('*', captured),
			kind: classifyTarget(t.target.replace('*', captured)),
		})),
	};
}
