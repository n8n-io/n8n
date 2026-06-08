/**
 * before/after content of each changed package.json, for the `@n8n/test-impact`
 * devDependency classifier. Any read failure → '' so the classifier stays
 * conservative (an unreadable manifest is treated as a non-devDep change, kept).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getGitRoot } from '../utils/git-operations.js';

const isManifest = (file: string): boolean => /(^|\/)package\.json$/.test(file);

const showAtRef = (root: string, ref: string, file: string): string => {
	try {
		return execFileSync('git', ['show', `${ref}:${file}`], {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		});
	} catch {
		return '';
	}
};

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
			before: showAtRef(root, baseRef, file),
			after: existsSync(abs) ? readFileSync(abs, 'utf8') : '',
		};
	}
	return out;
}
