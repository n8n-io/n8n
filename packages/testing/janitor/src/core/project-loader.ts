import { Project, type SourceFile } from 'ts-morph';
import * as path from 'path';
import { getConfig } from '../config.js';
import { getRelativePath as getRelPath } from '../utils/paths.js';

export interface ProjectContext {
	project: Project;
	root: string;
}

/**
 * Initialize ts-morph Project with the configured root directory
 */
export function createProject(rootDir?: string): ProjectContext {
	const root = rootDir ?? getConfig().rootDir;
	const tsconfigPath = path.join(root, 'tsconfig.json');

	const project = new Project({
		tsConfigFilePath: tsconfigPath,
	});

	return {
		project,
		root,
	};
}

/**
 * Create an in-memory project for testing
 */
export function createInMemoryProject(): Project {
	return new Project({ useInMemoryFileSystem: true });
}

/**
 * Get source files matching the given glob patterns
 * @param project - ts-morph Project instance
 * @param globs - Array of glob patterns relative to root
 * @returns Matching source files
 */
export function getSourceFiles(project: Project, globs: string[]): SourceFile[] {
	const files: SourceFile[] = [];
	const root = getConfig().rootDir;
	const absoluteGlobs = globs.map((glob) => path.join(root, glob));

	for (const glob of absoluteGlobs) {
		const matchingFiles = project.getSourceFiles(glob);
		files.push(...matchingFiles);
	}

	// Deduplicate in case of overlapping globs
	const uniqueFiles = new Map<string, SourceFile>();
	for (const file of files) {
		uniqueFiles.set(file.getFilePath(), file);
	}

	return Array.from(uniqueFiles.values());
}

/**
 * Get the relative path from root directory
 * Re-exported for convenience
 */
export function getRelativePath(filePath: string): string {
	return getRelPath(filePath);
}
