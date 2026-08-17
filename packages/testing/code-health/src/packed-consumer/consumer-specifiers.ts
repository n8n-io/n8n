import fg from 'fast-glob';
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
 */

/**
 * Files that can carry a module or stylesheet specifier.
 *
 * Test files are excluded, and deliberately so. The question this check asks is what the published
 * surface owes a consumer, and a test never ships — but a test is exactly where a made-up
 * specifier appears as a fixture string, which would fail the job for a specifier nobody imports.
 */
const SOURCE_GLOBS = [
	'**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,vue,scss,sass,css}',
	'!**/node_modules/**',
	'!**/dist/**',
	'!**/.turbo/**',
	'!**/src/template/**',
	'!**/*.{test,spec}.*',
	'!**/__tests__/**',
	'!**/__mocks__/**',
	// This checker itself. It generates consumer code, so it holds specifiers as data and names
	// them in doc comments — none of which is anybody importing anything.
	'!packages/testing/code-health/**',
];

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

/** Scan the whole repo (excluding the package itself) for specifiers naming `pkgName`. */
export async function collectConsumerSpecifiers(
	rootDir: string,
	pkgName: string,
	ownRelDir: string,
): Promise<SpecifierUse[]> {
	const files = await fg(SOURCE_GLOBS, {
		cwd: rootDir,
		absolute: true,
		// The package's own sources import themselves through the `@n8n/design-system` -> `src`
		// self-alias, which says nothing about what the tarball owes an external consumer.
		ignore: [`${ownRelDir}/**`],
	});

	const bySpecifier = new Map<string, SpecifierUse>();
	for (const file of files) {
		let content: string;
		try {
			content = fs.readFileSync(file, 'utf-8');
		} catch {
			continue;
		}
		if (!content.includes(pkgName)) continue;
		for (const specifier of extractSpecifiers(content, pkgName)) {
			if (bySpecifier.has(specifier)) continue;
			bySpecifier.set(specifier, {
				specifier,
				file: path.relative(rootDir, file).split(path.sep).join('/'),
			});
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
