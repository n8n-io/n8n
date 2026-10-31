/**
 * Read which workspace packages a pnpm-lock.yaml change affects, by comparing
 * the lockfile at the base ref with the working tree. See `lockfileImpact` in
 * `@n8n/test-impact`.
 */
import { lockfileImpact } from '@n8n/test-impact';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAllDocuments } from 'yaml';

import { getGitRoot } from '../utils/git-operations.js';

export const LOCKFILE = 'pnpm-lock.yaml';

/** A package's tests load all its dependencies, but only a linked package's runtime ones. */
const UNIT_SECTIONS = {
	ownSections: ['dependencies', 'devDependencies', 'optionalDependencies'],
	linkedSections: ['dependencies', 'optionalDependencies'],
} as const;

function parseDocuments(text: string): unknown[] | null {
	const documents = parseAllDocuments(text);
	if (documents.length === 0 || documents.some((doc) => doc.errors.length > 0)) return null;
	return documents.map((doc) => doc.toJS());
}

function packageName(root: string, dir: string): string | undefined {
	try {
		const parsed: unknown = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
		if (typeof parsed !== 'object' || parsed === null || !('name' in parsed)) return undefined;
		return typeof parsed.name === 'string' ? parsed.name : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Names of the workspace packages whose resolved dependencies differ between
 * the lockfile at `baseRef` and the working tree. Null when the change cannot be
 * attributed to packages: a read or parse failure, a change to pnpm itself or to
 * lockfile settings, or a change to the root package's dependencies. Any package
 * can resolve the root's dependencies through the root `node_modules`.
 */
export function readLockfileImpact(baseRef: string): string[] | null {
	try {
		const root = getGitRoot(process.cwd());
		const lockPath = join(root, LOCKFILE);
		if (!existsSync(lockPath)) return null;
		const before = parseDocuments(
			execFileSync('git', ['show', `${baseRef}:${LOCKFILE}`], {
				cwd: root,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
				maxBuffer: 512 * 1024 * 1024,
			}),
		);
		const after = parseDocuments(readFileSync(lockPath, 'utf8'));
		if (!before || !after) return null;
		const dirs = lockfileImpact(before, after, UNIT_SECTIONS);
		if (!dirs || dirs.includes('.')) return null;
		return dirs.map((dir) => packageName(root, dir)).filter((name) => name !== undefined);
	} catch {
		return null;
	}
}

/**
 * Parse the `LOCKFILE_IMPACTED_PACKAGES` value that `janitor lockfile-impact`
 * prints: `ALL` or empty → null (no signal), `NONE` → [], else the names.
 */
export function parseLockfileImpact(value: string | undefined): string[] | null {
	const trimmed = value?.trim() ?? '';
	if (trimmed === '' || trimmed === 'ALL') return null;
	if (trimmed === 'NONE') return [];
	return trimmed.split(/\s+/);
}

/** The inverse of {@link parseLockfileImpact}. */
export function formatLockfileImpact(names: string[] | null): string {
	if (names === null) return 'ALL';
	return names.length === 0 ? 'NONE' : names.join(' ');
}
