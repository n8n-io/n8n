import { Project, type SourceFile } from 'ts-morph';
import * as path from 'path';

const PLAYWRIGHT_ROOT = path.join(__dirname, '..', '..', '..');

export interface ProjectContext {
	project: Project;
	root: string;
}

/**
 * Initialize ts-morph Project with the playwright tsconfig
 */
export function createProject(): ProjectContext {
	const project = new Project({
		tsConfigFilePath: path.join(PLAYWRIGHT_ROOT, 'tsconfig.json'),
	});

	return {
		project,
		root: PLAYWRIGHT_ROOT,
	};
}

/**
 * Get source files matching the given glob patterns
 * @param project - ts-morph Project instance
 * @param globs - Array of glob patterns relative to playwright root
 * @returns Matching source files
 */
export function getSourceFiles(project: Project, globs: string[]): SourceFile[] {
	const files: SourceFile[] = [];
	const absoluteGlobs = globs.map((glob) => path.join(PLAYWRIGHT_ROOT, glob));

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
 * Get the relative path from playwright root
 */
export function getRelativePath(filePath: string): string {
	return path.relative(PLAYWRIGHT_ROOT, filePath);
}
