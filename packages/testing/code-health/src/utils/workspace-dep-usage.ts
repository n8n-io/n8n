import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { PackageJsonDep, PackageJsonInfo } from './package-json-scanner.js';

/**
 * Only these sections are checked. A `peerDependencies` entry is a contract with
 * consumers, not a use, so it is never reported — and it marks the dependency as
 * intentional for the matching `devDependencies` entry (the peer + dev pairing
 * that `single-instance-libs` mandates).
 */
const CHECKED_SECTIONS = new Set(['dependencies', 'devDependencies']);

/**
 * Build outputs, caches and reports mirror sources, so a mention there is an
 * echo of one the scan already saw. Markdown is excluded for a stronger reason:
 * prose cannot make a dependency necessary, and a doc that names a package —
 * often as an example path — would vouch for an edge no code needs.
 */
const IGNORED_PATHS = [
	'**/node_modules/**',
	'**/dist/**',
	'**/build/**',
	'**/.turbo/**',
	'**/coverage/**',
	'**/.nyc_output/**',
	'**/test-results/**',
	'**/playwright-report/**',
	'**/*.md',
	'**/*.mdx',
	'**/*.log',
	'**/*.map',
	'**/*.tsbuildinfo',
];

/** Binary payloads cannot mention a package name, so reading them only costs time. */
const BINARY_EXTENSIONS = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.ico',
	'.webp',
	'.avif',
	'.bmp',
	'.woff',
	'.woff2',
	'.ttf',
	'.eot',
	'.otf',
	'.mp3',
	'.mp4',
	'.webm',
	'.ogg',
	'.wav',
	'.pdf',
	'.zip',
	'.gz',
	'.tgz',
	'.br',
	'.node',
	'.wasm',
]);

/** A dependency to look for, plus the other tokens that count as a mention of it. */
export interface DepCandidate {
	name: string;
	/** Binaries the dependency provides — how a `scripts` entry or a `.bin` lookup names it. */
	aliases: string[];
}

/** The `workspace:*` entries of a manifest that this rule can report. */
export function workspaceDepCandidates(info: PackageJsonInfo): PackageJsonDep[] {
	return info.deps.filter(
		(dep) => CHECKED_SECTIONS.has(dep.section) && dep.version.startsWith('workspace:'),
	);
}

/**
 * Package name -> the binaries it provides. A package is used when its binary is
 * named, even though the package name never appears: a `scripts` entry invokes
 * it (`"lint": "n8n-node lint"`), or code resolves it out of `.bin`.
 */
export function collectBinNames(packageJsonFiles: string[]): Map<string, string[]> {
	const bins = new Map<string, string[]>();

	for (const file of packageJsonFiles) {
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
		} catch {
			continue;
		}
		const name = parsed.name;
		if (typeof name !== 'string') continue;

		const bin = parsed.bin;
		if (typeof bin === 'string') bins.set(name, [path.basename(name)]);
		else if (bin && typeof bin === 'object') bins.set(name, Object.keys(bin));
	}

	return bins;
}

function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match the package name as a whole specifier. `/` is allowed on both sides so a
 * subpath import (`@n8n/config/dist/x`) counts, while a longer neighbouring name
 * (`n8n-core-extra`, `@n8n/utils-web`) does not.
 */
export function mentionPattern(name: string): RegExp {
	return new RegExp(`(?<![A-Za-z0-9._-])${escapeForRegExp(name)}(?![A-Za-z0-9._-])`);
}

/**
 * A binary resolved out of `node_modules/.bin`, the form a package uses to run a
 * dependency's executable without importing it.
 */
export function binPathPattern(binName: string): RegExp {
	return new RegExp(`\\.bin/${escapeForRegExp(binName)}(?![A-Za-z0-9._-])`);
}

/**
 * The manifest's own text minus the sections this rule checks, so a declaration
 * cannot vouch for itself. Everything else stays: a `scripts` entry that invokes
 * the dependency, an `exports` map, a `peerDependencies` contract, n8n metadata.
 */
export function manifestScanText(filePath: string): string {
	const raw = fs.readFileSync(filePath, 'utf-8');
	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const { dependencies, devDependencies, optionalDependencies, ...rest } = parsed;
		return JSON.stringify(rest);
	} catch {
		return raw;
	}
}

function isScannable(file: string): boolean {
	return !BINARY_EXTENSIONS.has(path.extname(file).toLowerCase());
}

/** Shallow files first: a package's configs and entry points sit near its root. */
function byProximityToRoot(a: string, b: string): number {
	const depth = a.split(path.sep).length - b.split(path.sep).length;
	return depth !== 0 ? depth : a.localeCompare(b);
}

/**
 * Patterns that prove a dependency is used. A bin name is a bare word
 * (`janitor`, `rimraf`), so it counts only where it can only be a command: the
 * manifest's own `scripts`, or a `.bin/` path. Matching it in arbitrary source
 * would let any prose or identifier vouch for the edge.
 */
interface UsagePatterns {
	anywhere: RegExp[];
	manifestOnly: RegExp[];
}

function consume(pending: Map<string, UsagePatterns>, text: string, isManifest = false): void {
	for (const [name, patterns] of pending) {
		const candidates = isManifest
			? [...patterns.anywhere, ...patterns.manifestOnly]
			: patterns.anywhere;
		if (candidates.some((pattern) => pattern.test(text))) pending.delete(name);
	}
}

/**
 * Return the names that appear nowhere in the package, in any form — import,
 * dynamic import, `require`, tsconfig `extends`, a config file outside `src`, a
 * `scripts` entry, a CSS/asset reference, or a plain string used to resolve a
 * path. Any mention counts as a use: the rule reports drift, so a false negative
 * costs nothing while a false positive sends someone to delete a live edge.
 *
 * `nestedPackageDirs` are workspace packages inside `packageDir`; they declare
 * their own dependencies and must not vouch for their parent's.
 */
export async function findUnmentionedDeps(
	packageDir: string,
	candidates: DepCandidate[],
	nestedPackageDirs: string[] = [],
): Promise<string[]> {
	const pending = new Map<string, UsagePatterns>(
		candidates.map(({ name, aliases }) => [
			name,
			{
				anywhere: [mentionPattern(name), ...aliases.map(binPathPattern)],
				manifestOnly: aliases.map(mentionPattern),
			},
		]),
	);
	if (pending.size === 0) return [];

	const packageJsonPath = path.join(packageDir, 'package.json');
	consume(pending, manifestScanText(packageJsonPath), true);
	if (pending.size === 0) return [];

	const nestedIgnores = nestedPackageDirs.map((dir) => {
		const relative = path.relative(packageDir, dir).split(path.sep).join('/');
		return `${relative}/**`;
	});

	const files = await fg('**/*', {
		cwd: packageDir,
		absolute: true,
		dot: true,
		ignore: [...IGNORED_PATHS, ...nestedIgnores],
	});

	for (const file of files.filter(isScannable).sort(byProximityToRoot)) {
		if (file === packageJsonPath) continue;

		let text: string;
		try {
			text = fs.readFileSync(file, 'utf-8');
		} catch {
			continue;
		}

		consume(pending, text);
		if (pending.size === 0) return [];
	}

	return [...pending.keys()];
}
