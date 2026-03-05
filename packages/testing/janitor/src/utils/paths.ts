import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { getConfig, hasConfig } from '../config.js';

/**
 * Get the root directory for the Playwright test suite
 * Uses the configured rootDir from janitor config
 */
export function getRootDir(): string {
	return getConfig().rootDir;
}

/**
 * Check if a file path is within the pages directory (excluding components)
 */
export function isPageFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replaceAll('\\', '/');
	return normalized.includes('/pages/') && !normalized.includes('/pages/components/');
}

/**
 * Check if a file path is within the pages/components directory
 */
export function isComponentFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replaceAll('\\', '/');
	return normalized.includes('/pages/components/');
}

/**
 * Check if a file path is within the flows directory (composables/actions/flows)
 */
export function isFlowFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replaceAll('\\', '/');
	const config = getConfig();

	return config.patterns.flows.some((pattern) => {
		const baseDir = pattern.replace('**/*.ts', '').replace('/**/*.ts', '');
		return normalized.includes(`/${baseDir}`);
	});
}

/**
 * Check if a file path is a test file (in tests directory with .spec.ts extension)
 */
export function isTestFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replaceAll('\\', '/');
	return (
		(normalized.startsWith('tests/') || normalized.includes('/tests/')) &&
		normalized.endsWith('.spec.ts')
	);
}

/**
 * Check if a file should be excluded from page analysis
 */
export function isExcludedPage(filePath: string): boolean {
	const normalized = path.normalize(filePath).replaceAll('\\', '/');
	const config = getConfig();

	return config.excludeFromPages.some((exclude) => normalized.endsWith(exclude));
}

/**
 * Get files matching glob patterns from test data config
 */
export function getTestDataFiles(patterns: string[]): string[] {
	const root = getRootDir();
	const files: string[] = [];

	for (const pattern of patterns) {
		const matches = glob.sync(pattern, { cwd: root, nodir: true, absolute: true });
		files.push(...matches);
	}

	return files;
}

/**
 * Resolve a path relative to the root directory
 */
export function resolvePath(relativePath: string): string {
	const root = getRootDir();
	return path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
}

/**
 * Get the relative path from root directory
 */
export function getRelativePath(absolutePath: string): string {
	if (!hasConfig()) {
		return absolutePath;
	}
	return path.relative(getRootDir(), absolutePath);
}

/**
 * Recursively find files matching a suffix in a directory
 */
export function findFilesRecursive(dir: string, suffix: string): string[] {
	const results: string[] = [];

	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...findFilesRecursive(fullPath, suffix));
			} else if (entry.name.endsWith(suffix)) {
				results.push(fullPath);
			}
		}
	} catch {
		// Directory read error, skip
	}

	return results;
}

/**
 * Check if a file path matches any of the given glob patterns
 */
export function matchesPatterns(filePath: string, patterns: string[]): boolean {
	const relativePath = getRelativePath(filePath);

	for (const pattern of patterns) {
		// Simple glob matching (supports ** and *)
		const regexPattern = pattern
			.replace(/\*\*/g, '<<<DOUBLESTAR>>>')
			.replace(/\*/g, '[^/]*')
			.replace(/<<<DOUBLESTAR>>>/g, '.*');

		const regex = new RegExp(`^${regexPattern}$`);
		if (regex.test(relativePath)) {
			return true;
		}
	}

	return false;
}
