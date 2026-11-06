#!/usr/bin/env node
// @ts-check
/**
 * Checks that the code names in docs/backend still exist in the repository.
 *
 * The documents name files and symbols instead of quoting code, so that they stay
 * correct while the code moves. This script finds the names that no longer resolve:
 *   - a repository path in a code span, for example `packages/cli/src/server.ts`,
 *   - a symbol in a table that has a "File" column and a "Symbol" column. The last
 *     part of the symbol, for example `start` in `Server.start`, must occur in a
 *     file of the same row,
 *   - an environment variable in a code span, for example `N8N_ENABLED_MODULES`.
 *     It must occur somewhere outside docs/backend.
 *
 * Relative Markdown links are checked by Lychee, not here.
 *
 *   node scripts/backend-docs-check.mjs     # exit 1 and list each name that does not resolve
 *
 * Only node built-ins and git are used, so CI needs no dependency install.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(REPO_ROOT, 'docs/backend');

const PATH_PREFIX = /^(packages|scripts|docs|\.github|\.agents|\.claude|patches|security|docker)\//;
const ROOT_FILES = new Set(['AGENTS.md', 'CONTRIBUTING.md', 'OWNERS', 'package.json', 'pnpm-workspace.yaml']);
const SYMBOL = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*(\(\))?$/;
const ENV_VAR = /^N8N_[A-Z0-9_]+$/;

/** @param {string} dir @returns {string[]} */
function markdownFiles(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (name === 'styles' || name === 'node_modules') return [];
		if (statSync(path).isDirectory()) return markdownFiles(path);
		return name.endsWith('.md') ? [path] : [];
	});
}

/** Returns the code spans of a line, outside fenced blocks. @param {string} line */
function codeSpans(line) {
	return [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());
}

/** Turns `path/to/file.ts:120` or `path/to/dir/` into a plain path. Returns undefined for patterns. @param {string} span */
function asRepoPath(span) {
	if (!PATH_PREFIX.test(span) && !ROOT_FILES.has(span)) return undefined;
	if (/[<>*{}\s]/.test(span)) return undefined;
	return span.replace(/:\d+(-\d+)?$/, '').replace(/\/$/, '');
}

/** @type {Map<string, string>} */
const fileCache = new Map();
/** @param {string} path */
function readRepoFile(path) {
	if (!fileCache.has(path)) fileCache.set(path, readFileSync(join(REPO_ROOT, path), 'utf8'));
	return /** @type {string} */ (fileCache.get(path));
}

/** @param {string} name */
function occursOutsideDocs(name) {
	try {
		execFileSync('git', ['grep', '-q', '-F', name, '--', '.', ':!docs/backend'], { cwd: REPO_ROOT });
		return true;
	} catch {
		return false;
	}
}

const problems = [];
const envVars = new Map();

/** @param {string} line */
const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const isTableRow = (/** @type {string} */ line) => line.trim().startsWith('|');
const isDivider = (/** @type {string} */ line) => /^\|?\s*:?-{3,}/.test(line.trim());

for (const file of markdownFiles(DOCS_DIR)) {
	const doc = relative(REPO_ROOT, file);
	const lines = readFileSync(file, 'utf8').split('\n');
	let inFence = false;
	/** @type {{ file: number, symbol: number } | undefined} */
	let columns;
	lines.forEach((line, index) => {
		if (/^\s*```/.test(line)) inFence = !inFence;
		if (inFence) return;
		const where = `${doc}:${index + 1}`;
		const spans = codeSpans(line);

		for (const span of spans) {
			if (ENV_VAR.test(span) && !envVars.has(span)) envVars.set(span, where);
			const path = asRepoPath(span);
			if (path && !existsSync(join(REPO_ROOT, path))) problems.push(`${where}  path does not exist: ${span}`);
		}

		if (!isTableRow(line)) {
			columns = undefined;
			return;
		}
		if (isDivider(line)) return;
		const row = cells(line);
		if (isDivider(lines[index + 1] ?? '')) {
			const header = row.map((cell) => cell.toLowerCase());
			const fileColumn = header.findIndex((cell) => cell === 'file' || cell === 'path');
			const symbolColumn = header.findIndex((cell) => cell.endsWith('symbol'));
			columns = fileColumn >= 0 && symbolColumn >= 0 ? { file: fileColumn, symbol: symbolColumn } : undefined;
			return;
		}
		if (!columns) return;
		const files = codeSpans(row[columns.file] ?? '')
			.map(asRepoPath)
			.filter((path) => path && existsSync(join(REPO_ROOT, path)) && statSync(join(REPO_ROOT, path)).isFile());
		if (files.length === 0) return;
		for (const span of codeSpans(row[columns.symbol] ?? '')) {
			if (!SYMBOL.test(span)) continue;
			const name = span.replace(/\(\)$/, '').split('.').pop() ?? span;
			if (!files.some((path) => readRepoFile(/** @type {string} */ (path)).includes(name))) {
				problems.push(`${where}  symbol not found in ${files.join(', ')}: ${span}`);
			}
		}
	});
}

for (const [name, where] of envVars) {
	if (!occursOutsideDocs(name)) problems.push(`${where}  environment variable not found in the repository: ${name}`);
}

if (problems.length > 0) {
	console.error(problems.join('\n'));
	console.error(`\n${problems.length} code names in docs/backend do not resolve. Update the text to match the code.`);
	process.exit(1);
}
console.log('All code names in docs/backend resolve.');
