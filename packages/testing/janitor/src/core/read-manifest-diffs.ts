/**
 * before/after content of changed files, for the `@n8n/test-impact` content-aware
 * classifiers. Any read failure → '' so a classifier stays conservative (an
 * unreadable file is treated as impactful).
 */
import { type FileDiffs } from '@n8n/test-impact';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getFileAtRef, getGitRoot } from '../utils/git-operations.js';

export const isManifest = (file: string): boolean => /(^|\/)package\.json$/.test(file);

/** Read the working-tree file, or '' on any failure (missing, unreadable, or a
 *  TOCTOU delete between the existsSync check and the read). */
function readWorkingTree(abs: string): string {
	try {
		return existsSync(abs) ? readFileSync(abs, 'utf8') : '';
	} catch {
		return '';
	}
}

/** before/after content of each changed file matching `predicate`. */
export function readFileDiffs(
	changedFiles: string[],
	baseRef: string,
	predicate: (file: string) => boolean,
): FileDiffs {
	const matched = changedFiles.filter(predicate);
	if (matched.length === 0) return {};
	const root = getGitRoot(process.cwd());
	const out: FileDiffs = {};
	for (const file of matched) {
		out[file] = {
			before: getFileAtRef(file, baseRef) ?? '',
			after: readWorkingTree(join(root, file)),
		};
	}
	return out;
}
