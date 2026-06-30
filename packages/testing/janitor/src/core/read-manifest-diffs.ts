/**
 * before/after content of each changed package.json, for the `@n8n/test-impact`
 * devDependency classifier. Any read failure → '' so the classifier stays
 * conservative (an unreadable manifest is treated as a non-devDep change, kept).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getFileAtRef, getGitRoot } from '../utils/git-operations.js';

const isManifest = (file: string): boolean => /(^|\/)package\.json$/.test(file);

/** Read the working-tree file, or '' on any failure (missing, unreadable, or a
 *  TOCTOU delete between the existsSync check and the read). */
function readWorkingTree(abs: string): string {
	try {
		return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
	} catch {
		return '';
	}
}

export function readManifestDiffs(
	changedFiles: string[],
	baseRef: string,
): Record<string, { before: string; after: string }> {
	const manifests = changedFiles.filter(isManifest);
	if (manifests.length === 0) return {};
	const root = getGitRoot(process.cwd());
	const out: Record<string, { before: string; after: string }> = {};
	for (const file of manifests) {
		const abs = join(root, file);
		out[file] = {
			before: getFileAtRef(file, baseRef) ?? '',
			after: readWorkingTree(abs),
		};
	}
	return out;
}
