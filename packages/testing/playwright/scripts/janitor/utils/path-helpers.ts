import * as path from 'path';
import { getConfig } from '../janitor.config';

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
 * Check if a file path is within the flows directory (composables/actions/flows)
 */
export function isFlowFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	const config = getConfig();

	// Check against flow patterns
	return config.patterns.flows.some((pattern) => {
		const baseDir = pattern.replace('**/*.ts', '').replace('/**/*.ts', '');
		return normalized.includes(`/${baseDir}`);
	});
}

/**
 * Check if a file path is within the tests directory
 */
export function isTestFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	return normalized.includes('/tests/');
}

/**
 * Check if a file is a facade file (aggregator that should be skipped in import tracing)
 */
export function isFacadeFile(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	const config = getConfig();

	return config.facades.some(
		(facade) => normalized.endsWith(`/${facade}`) || normalized === facade,
	);
}

/**
 * Check if a file should be excluded from page analysis
 */
export function isExcludedPage(filePath: string): boolean {
	const normalized = path.normalize(filePath).replace(/\\/g, '/');
	const config = getConfig();

	return config.excludeFromPages.some((exclude) => normalized.endsWith(exclude));
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

// Legacy aliases for backwards compatibility
export const isComposableFile = isFlowFile;
export const isN8nPageFile = isFacadeFile;
export const isBasePageFile = isExcludedPage;
