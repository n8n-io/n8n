import * as path from 'node:path';
import { Project, type SourceFile } from 'ts-morph';

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
	const root = getConfig().rootDir;
	const absoluteGlobs = globs.map((glob) => path.join(root, glob));

	// Add files to project if not already present, then return them
	// This ensures files matching globs are loaded even if not in tsconfig
	const addedFiles = project.addSourceFilesAtPaths(absoluteGlobs);

	// Also get any existing files that match (in case already loaded via tsconfig)
	const existingFiles: SourceFile[] = [];
	for (const glob of absoluteGlobs) {
		existingFiles.push(...project.getSourceFiles(glob));
	}

	// Deduplicate
	const uniqueFiles = new Map<string, SourceFile>();
	for (const file of [...addedFiles, ...existingFiles]) {
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
