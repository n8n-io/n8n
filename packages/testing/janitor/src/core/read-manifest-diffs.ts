/**
 * before/after content of changed package.json / tsconfig files, for the
 * `@n8n/test-impact` classifiers. Any read failure → '' so a classifier stays
 * conservative (an unreadable file is treated as impactful).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getFileAtRef, getGitRoot } from '../utils/git-operations.js';

const isManifest = (file: string): boolean => /(^|\/)package\.json$/.test(file);
const isTsconfig = (file: string): boolean => /(^|\/)tsconfig([.\w-]*)\.json$/.test(file);

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
function readFileDiffs(
	changedFiles: string[],
	baseRef: string,
	predicate: (file: string) => boolean,
): Record<string, { before: string; after: string }> {
	const matched = changedFiles.filter(predicate);
	if (matched.length === 0) return {};
	const root = getGitRoot(process.cwd());
	const out: Record<string, { before: string; after: string }> = {};
	for (const file of matched) {
		out[file] = {
			before: getFileAtRef(file, baseRef) ?? '',
			after: readWorkingTree(join(root, file)),
		};
	}
	return out;
}

export function readManifestDiffs(
	changedFiles: string[],
	baseRef: string,
): Record<string, { before: string; after: string }> {
	return readFileDiffs(changedFiles, baseRef, isManifest);
}

export function readTsconfigDiffs(
	changedFiles: string[],
	baseRef: string,
): Record<string, { before: string; after: string }> {
	return readFileDiffs(changedFiles, baseRef, isTsconfig);
}
