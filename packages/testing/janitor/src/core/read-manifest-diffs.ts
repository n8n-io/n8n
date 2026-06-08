/**
 * Read the before/after content of each changed package.json, for the
 * `@n8n/test-impact` devDependency-only classifier. Pure git I/O, no AST.
 *
 *  - before: the manifest at `baseRef` ('' if it didn't exist there → the
 *            classifier treats it as an empty manifest);
 *  - after:  the working-tree manifest ('' if deleted).
 *
 * Every failure degrades to '' so the classifier stays conservative — a manifest
 * it can't read is treated as a non-devDep change and kept in selection.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const isManifest = (file: string): boolean => /(^|\/)package\.json$/.test(file);

function gitToplevel(): string {
	try {
		return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
	} catch {
		return process.cwd();
	}
}

export function readManifestDiffs(
	changedFiles: string[],
	baseRef: string,
): Record<string, { before: string; after: string }> {
	const manifests = changedFiles.filter(isManifest);
	if (manifests.length === 0) return {};
	const root = gitToplevel();
	const out: Record<string, { before: string; after: string }> = {};
	for (const file of manifests) {
		let before = '';
		try {
			before = execFileSync('git', ['show', `${baseRef}:${file}`], {
				cwd: root,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			});
		} catch {
			before = '';
		}
		let after = '';
		try {
			const abs = join(root, file);
			if (existsSync(abs)) after = readFileSync(abs, 'utf8');
		} catch {
			after = '';
		}
		out[file] = { before, after };
	}
	return out;
}
