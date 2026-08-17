import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Enumerate the specifiers the monorepo actually writes for a published package.
 *
 * Every one of them has to resolve through the published `exports` map. A specifier that only
 * resolves through a build-time alias is the exact defect this check exists to catch: it works
 * for every package inside the workspace and fails for the first consumer outside it. Deriving
 * the set from the source tree — rather than from a list in this file — is what keeps that
 * property true after the next import is added.
 *
 * The file set comes from `git ls-files`, not from a glob. A glob needs a hand-written list of
 * directories to skip, and every entry missing from that list is a silent hole: `dot: false` (the
 * `fast-glob` default) hid `.storybook/`, where a build-time config imports this package, and
 * `storybook-static/` — a build output nobody had thought to exclude — contributed four specifiers
 * out of bundled asset files. Tracked-or-not answers both, permanently and without a list:
 * generated output is never tracked, and a dot-directory is tracked like anything else.
 */

const SCANNED_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.mts',
	'.cts',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.vue',
	'.scss',
	'.sass',
	'.css',
]);

/**
 * Tracked paths that still must not contribute a specifier.
 *
 * Unlike the directories a glob would have to skip, each of these is a semantic exclusion rather
 * than a mechanical one, so each is stated with its reason:
 *
 * - Test files never ship, and a test is exactly where a made-up specifier appears as a fixture
 *   string — which would fail the job for a specifier nobody imports.
 * - This checker generates consumer code, so it holds specifiers as data and names them in doc
 *   comments. Both were observed producing phantom findings.
 * - `src/template/` is scaffolding for generated user projects, not code this repo builds.
 */
function isSemanticallyExcluded(relPath: string): boolean {
	if (/(^|\/)__(tests|mocks)__\//.test(relPath)) return true;
	if (/\.(test|spec)\.[^/]+$/.test(relPath)) return true;
	if (relPath.startsWith('packages/testing/code-health/')) return true;
	if (relPath.includes('/src/template/')) return true;
	return false;
}

/** True when a tracked repo-relative path should be read for specifiers. */
export function isScannableFile(relPath: string): boolean {
	if (!SCANNED_EXTENSIONS.has(path.extname(relPath))) return false;
	return !isSemanticallyExcluded(relPath);
}

export interface SpecifierUse {
	specifier: string;
	/** Repo-relative path of the first file seen importing it. */
	file: string;
}

/**
 * Match the package name only where a specifier can legally appear: inside a quoted string
 * (`import … from '…'`, `@use '…'`) or a `url()`. An unquoted mention in prose is a comment,
 * and failing the build over a comment would teach people to distrust the check.
 *
 * The trailing lookahead is what stops `@n8n/design-system-icons` from being read as a bare
 * import of `@n8n/design-system` — a different package reported as this one.
 */
function specifierPattern(pkgName: string): RegExp {
	const escaped = pkgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`['"\`(]\\s*(${escaped}(?:/[^'"\`)\\s]*)?)(?=['"\`)\\s]|$)`, 'g');
}

/** Distinct specifiers for `pkgName` in `content`, with any trailing punctuation removed. */
export function extractSpecifiers(content: string, pkgName: string): string[] {
	const found = new Set<string>();
	for (const match of content.matchAll(specifierPattern(pkgName))) {
		const specifier = match[1].replace(/[;,)]+$/, '');
		// `paths` patterns in a tsconfig, not something a consumer can import.
		if (specifier.includes('*')) continue;
		found.add(specifier);
	}
	return [...found];
}

/**
 * True for the alias-only internal form. `@n8n/design-system/src/…` is deliberately outside the
 * `exports` map: `files` ships `dist`, not `src`, so these are workspace-internal by construction
 * and must not be reported as a broken published specifier.
 */
export function isInternalSourceSpecifier(pkgName: string, specifier: string): boolean {
	return specifier === `${pkgName}/src` || specifier.startsWith(`${pkgName}/src/`);
}

/**
 * Every git-tracked, scannable path in the repo.
 *
 * Throws rather than falling back to a filesystem walk. A fallback would keep the job green while
 * scanning a different — and smaller — set of files than it reports, which is the failure mode this
 * whole function was just rewritten to remove.
 */
export function trackedScannableFiles(rootDir: string): string[] {
	let out: string;
	try {
		out = execFileSync('git', ['ls-files', '-z'], {
			cwd: rootDir,
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024,
		});
	} catch (cause) {
		throw new Error(
			`Cannot list tracked files in ${rootDir}. This check reads the git index to know what ` +
				'to scan, so it needs a git checkout.',
			{ cause },
		);
	}
	return out.split('\0').filter((f) => f.length > 0 && isScannableFile(f));
}

/** Scan the whole repo (excluding the package itself) for specifiers naming `pkgName`. */
export function collectConsumerSpecifiers(
	rootDir: string,
	pkgName: string,
	ownRelDir: string,
): SpecifierUse[] {
	const bySpecifier = new Map<string, SpecifierUse>();
	for (const relPath of trackedScannableFiles(rootDir)) {
		// The package's own sources import themselves through the `@n8n/design-system` -> `src`
		// self-alias, which says nothing about what the tarball owes an external consumer.
		if (relPath.startsWith(`${ownRelDir}/`)) continue;
		let content: string;
		try {
			content = fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
		} catch {
			continue;
		}
		if (!content.includes(pkgName)) continue;
		for (const specifier of extractSpecifiers(content, pkgName)) {
			if (bySpecifier.has(specifier)) continue;
			bySpecifier.set(specifier, { specifier, file: relPath });
		}
	}
	return [...bySpecifier.values()].sort((a, b) => a.specifier.localeCompare(b.specifier));
}

/**
 * Candidate files for a resolved `exports` target.
 *
 * Node requires the target to name a file exactly, and for JS it does. Sass does not: it runs its
 * own load algorithm on top of the `exports` result, so `@n8n/design-system/css/_tokens` legally
 * resolves to `_tokens.scss` and `css/mixins/motion` to `motion.scss`. Rejecting those would fail
 * the job on imports that work, so stylesheet targets get sass's candidate list.
 */
export function targetCandidates(target: string): string[] {
	const clean = target.replace(/^\.\//, '');
	if (/\.(css|scss|sass|[cm]?js|d\.[cm]?ts|json)$/.test(clean)) return [clean];
	const dir = path.posix.dirname(clean);
	const base = path.posix.basename(clean);
	return [
		clean,
		`${clean}.scss`,
		`${clean}.css`,
		path.posix.join(dir, `_${base}.scss`),
		path.posix.join(clean, 'index.scss'),
		path.posix.join(clean, '_index.scss'),
	];
}

/** First candidate for `target` that exists under `packageRoot`, or `null`. */
export function resolveTargetFile(packageRoot: string, target: string): string | null {
	for (const candidate of targetCandidates(target)) {
		const absolute = path.join(packageRoot, candidate);
		if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return candidate;
	}
	return null;
}
