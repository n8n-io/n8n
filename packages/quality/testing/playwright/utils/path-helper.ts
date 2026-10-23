import * as fs from 'fs';
import * as path from 'path';

import { TestError } from '../Types';

/**
 * Finds the project root by searching upwards for a marker file.
 * @param marker The file that identifies the project root (e.g., 'playwright.config.ts' or 'package.json').
 * @returns The absolute path to the project root.
 */
function findProjectRoot(marker: string): string {
	let dir = __dirname;
	while (!fs.existsSync(path.join(dir, marker))) {
		const parentDir = path.dirname(dir);
		if (parentDir === dir) {
			throw new TestError('Could not find project root');
		}
		dir = parentDir;
	}
	return dir;
}

/**
 * Finds a folder root by searching upwards for a marker folder named 'packages'.
 * @returns The absolute path to the folder root.
 */
export function findPackagesRoot(marker: string): string {
	let dir = __dirname;
	while (!fs.existsSync(path.join(dir, marker))) {
		const parentDir = path.dirname(dir);
		if (parentDir === dir) {
			throw new TestError('Could not find packages root');
		}
		dir = parentDir;
	}
	return dir;
}

const playwrightRoot = findProjectRoot('playwright.config.ts');

/**
 * Resolves a path relative to the Playwright project root.
 * @param pathSegments Segments of the path starting from the project root.
 * @returns An absolute path to the file or directory.
 */
export function resolveFromRoot(...pathSegments: string[]): string {
	return path.join(playwrightRoot, ...pathSegments);
}
