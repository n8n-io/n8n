/**
 * Git Operations Utility
 *
 * Centralized git operations for the janitor tool.
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

export interface GitChangedFilesOptions {
	targetBranch?: string;
	scopeDir: string;
	extensions?: string[];
}

export function getGitRoot(cwd: string): string {
	try {
		return execFileSync('git', ['rev-parse', '--show-toplevel'], {
			cwd,
			encoding: 'utf-8',
		}).trim();
	} catch {
		return cwd;
	}
}

export function parseGitStatus(
	output: string,
	gitRoot: string,
	scopeDir: string,
	extensions: string[] = ['.ts'],
): string[] {
	const files: string[] = [];
	const gitStatusPattern = /^.{2}\s+(.+)$/;

	for (const line of output.split('\n')) {
		if (!line.trim()) continue;
		const match = gitStatusPattern.exec(line);
		if (match) {
			const filePath = match[1];
			// Handle renamed files (old -> new)
			const actualPath = filePath.includes(' -> ') ? filePath.split(' -> ')[1] : filePath;
			const fullPath = path.join(gitRoot, actualPath);

			// Filter by scope directory
			if (!fullPath.startsWith(scopeDir)) continue;

			// Filter by extension if specified
			if (extensions.length > 0) {
				const hasValidExtension = extensions.some((ext) => actualPath.endsWith(ext));
				if (!hasValidExtension) continue;
			}

			files.push(fullPath);
		}
	}

	return files;
}

export function parseGitDiff(output: string, gitRoot: string, scopeDir: string): string[] {
	const files: string[] = [];

	for (const line of output.split('\n')) {
		if (!line.trim()) continue;
		const fullPath = path.join(gitRoot, line);
		if (fullPath.startsWith(scopeDir)) {
			files.push(fullPath);
		}
	}

	return files;
}

export function getChangedFiles(options: GitChangedFilesOptions): string[] {
	const { targetBranch, scopeDir, extensions = [] } = options;
	const gitRoot = getGitRoot(scopeDir);

	try {
		if (targetBranch) {
			// Fetch the base branch at depth=1 so FETCH_HEAD is available for the diff.
			// Using FETCH_HEAD with two-dot diff avoids the need for a merge base, which
			// fails with shallow clones (fatal: no merge base). This matches the approach
			// used by the ci-filter action across the rest of the repo.
			const remoteName = targetBranch.startsWith('origin/') ? targetBranch.slice(7) : targetBranch;
			execFileSync('git', ['fetch', '--depth=1', 'origin', remoteName], {
				cwd: gitRoot,
				encoding: 'utf-8',
				stdio: 'pipe',
			});
			const output = execFileSync('git', ['diff', '--name-only', 'FETCH_HEAD', 'HEAD'], {
				cwd: gitRoot,
				encoding: 'utf-8',
			});
			return parseGitDiff(output, gitRoot, scopeDir);
		}

		// Use -uall to show individual files in new directories instead of just "dir/"
		const status = execFileSync('git', ['status', '--porcelain', '-uall'], {
			cwd: gitRoot,
			encoding: 'utf-8',
		});
		return parseGitStatus(status, gitRoot, scopeDir, extensions);
	} catch {
		return [];
	}
}

export function getTotalDiffLines(scopeDir: string, targetBranch?: string): number {
	const gitRoot = getGitRoot(scopeDir);

	try {
		const args = targetBranch
			? ['diff', '--stat', `${targetBranch}...HEAD`]
			: ['diff', '--stat', 'HEAD'];
		const output = execFileSync('git', args, { cwd: gitRoot, encoding: 'utf-8' });

		const lines = output.trim().split('\n');
		const summaryLine = lines[lines.length - 1];

		let total = 0;
		const insertionsPattern = /(\d+)\s+insertions?\(\+\)/;
		const deletionsPattern = /(\d+)\s+deletions?\(-\)/;
		const insertionsMatch = insertionsPattern.exec(summaryLine);
		const deletionsMatch = deletionsPattern.exec(summaryLine);

		if (insertionsMatch) total += Number.parseInt(insertionsMatch[1], 10);
		if (deletionsMatch) total += Number.parseInt(deletionsMatch[1], 10);

		return total;
	} catch {
		return 0;
	}
}

export function commit(message: string, cwd: string): boolean {
	const gitRoot = getGitRoot(cwd);
	try {
		execFileSync('git', ['add', '-A'], { cwd: gitRoot });
		execFileSync('git', ['commit', '-m', message], { cwd: gitRoot });
		return true;
	} catch {
		return false;
	}
}

export function revert(cwd: string): boolean {
	const gitRoot = getGitRoot(cwd);
	try {
		execFileSync('git', ['checkout', '--', '.'], { cwd: gitRoot });
		return true;
	} catch {
		return false;
	}
}
