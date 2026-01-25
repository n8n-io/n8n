import * as path from 'path';

/**
 * Check if a file path is within the pages directory (excluding components)
 */
export function isPageFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	return normalized.includes('/pages/') && !normalized.includes('/pages/components/');
}

/**
 * Check if a file path is within the pages/components directory
 */
export function isComponentFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	return normalized.includes('/pages/components/');
}

/**
 * Check if a file path is within the composables directory
 */
export function isComposableFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	return normalized.includes('/composables/');
}

/**
 * Check if a file path is within the tests directory
 */
export function isTestFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	return normalized.includes('/tests/');
}

/**
 * Check if a file is the special n8nPage.ts file
 */
export function isN8nPageFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	return normalized.endsWith('/n8nPage.ts');
}

/**
 * Check if a file is the BasePage.ts file
 */
export function isBasePageFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	return normalized.endsWith('/BasePage.ts');
}

/**
 * Get the filename from a path
 */
export function getFilename(filePath: string): string {
	return path.basename(filePath);
}

/**
 * Get the directory name from a path
 */
export function getDirname(filePath: string): string {
	return path.dirname(filePath);
}
