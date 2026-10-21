/** Finds ADR files and valid ADR directories in the workspace. */
import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { parseMarkdown } from './adr-conventions-markdown.js';
import type { ParsedMarkdown } from './adr-conventions-markdown.js';

const ADR_FILENAME = /^ADR-(\d{8})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const ADR_FILE_PATTERNS = ['**/ADR-*.md', 'docs/ADR_TEMPLATE.md'];
const GENERATED_DIRS = [
	'**/node_modules/**',
	'**/dist/**',
	'**/build/**',
	'**/out/**',
	'**/coverage/**',
	'**/.cache/**',
	'**/.turbo/**',
	'.git/**',
];

export interface AdrFile extends ParsedMarkdown {
	filePath: string;
	relativePath: string;
	fileName: string;
	fileId?: string;
	fileDate?: string;
	fileSlug?: string;
}

interface WorkspaceConfig {
	packages?: unknown;
}

interface GlobOptions {
	cwd: string;
	absolute: boolean;
	onlyFiles: boolean;
	ignore: string[];
}

export interface AdrFileAccess {
	glob: (patterns: string | string[], options: GlobOptions) => Promise<string[]>;
	readFile: (filePath: string) => string;
}

const defaultFileAccess: AdrFileAccess = {
	glob: async (patterns, options) => await fg(patterns, options),
	readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
};

/** Finds and parses all ADR files below the repository root. */
export async function findAdrFiles(
	rootDir: string,
	fileAccess: AdrFileAccess = defaultFileAccess,
): Promise<AdrFile[]> {
	const filePaths = await fileAccess.glob(ADR_FILE_PATTERNS, {
		cwd: rootDir,
		absolute: true,
		onlyFiles: true,
		ignore: GENERATED_DIRS,
	});

	return filePaths.map((filePath) => {
		const fileName = path.basename(filePath);
		const match = ADR_FILENAME.exec(fileName);
		const source = fileAccess.readFile(filePath).replaceAll('\r\n', '\n');
		return {
			filePath,
			relativePath: normalizePath(path.relative(rootDir, filePath)),
			fileName,
			...parseMarkdown(source),
			fileId: match ? fileName.slice(0, -3) : undefined,
			fileDate: match?.[1],
			fileSlug: match?.[2],
		};
	});
}

/** Finds the root and workspace package ADR directories. */
export async function findAllowedAdrDirectories(
	rootDir: string,
	fileAccess: AdrFileAccess = defaultFileAccess,
): Promise<Set<string>> {
	const workspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
	const parsed = parseYaml(fileAccess.readFile(workspacePath)) as WorkspaceConfig | null;
	const packagePatterns = Array.isArray(parsed?.packages)
		? parsed.packages.filter((entry): entry is string => typeof entry === 'string')
		: [];
	const packageJsonPatterns = packagePatterns.map((pattern) => {
		const negated = pattern.startsWith('!');
		const value = negated ? pattern.slice(1) : pattern;
		return `${negated ? '!' : ''}${value.replace(/\/$/, '')}/package.json`;
	});
	const packageJsonFiles = await fileAccess.glob(packageJsonPatterns, {
		cwd: rootDir,
		absolute: true,
		onlyFiles: true,
		ignore: GENERATED_DIRS,
	});
	const directories = new Set<string>([normalizePath(path.join(rootDir, 'docs', 'adr'))]);

	for (const packageJsonFile of packageJsonFiles) {
		directories.add(normalizePath(path.join(path.dirname(packageJsonFile), 'docs', 'adr')));
	}

	return directories;
}

/** Converts a file path to use forward slashes. */
export function normalizePath(value: string): string {
	return value.split(path.sep).join('/');
}
