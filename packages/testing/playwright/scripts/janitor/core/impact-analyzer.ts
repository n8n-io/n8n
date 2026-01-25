import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

const PLAYWRIGHT_ROOT = path.join(__dirname, '..', '..', '..');

// Default facade files - these aggregate imports but don't represent real usage
const DEFAULT_FACADES = ['pages/n8nPage.ts', 'fixtures/base.ts'];

export interface ImpactConfig {
	facades?: string[]; // Files that are facades (aggregators)
}

export interface ImpactResult {
	changedFiles: string[];
	affectedFiles: string[];
	affectedTests: string[];
	graph: Record<string, string[]>; // file -> files that depend on it
}

/**
 * Analyze the impact of file changes - what tests need to run?
 */
export class ImpactAnalyzer {
	private facades: Set<string>;

	constructor(
		private project: Project,
		config?: ImpactConfig,
	) {
		// Normalize facade paths to absolute
		const facadeList = config?.facades ?? DEFAULT_FACADES;
		this.facades = new Set(facadeList.map((f) => path.join(PLAYWRIGHT_ROOT, f)));
	}

	/**
	 * Given a list of changed files, determine which test files are affected
	 */
	analyze(changedFiles: string[]): ImpactResult {
		const absolutePaths = changedFiles.map((f) =>
			path.isAbsolute(f) ? f : path.join(PLAYWRIGHT_ROOT, f),
		);

		const affectedSet = new Set<string>();
		const graph: Record<string, string[]> = {};

		// For each changed file, find all files that depend on it
		for (const filePath of absolutePaths) {
			const sourceFile = this.project.getSourceFile(filePath);
			if (!sourceFile) {
				console.warn(`Warning: File not found in project: ${filePath}`);
				continue;
			}

			const relativePath = this.getRelativePath(filePath);

			// If the changed file is itself a test, it's affected
			if (this.isTestFile(relativePath)) {
				affectedSet.add(filePath);
			}

			// Find property names this file exposes (for property-based search)
			const propertyNames = this.extractPropertyNames(sourceFile);

			const dependents = this.findAllDependents(sourceFile, new Set(), propertyNames);

			graph[relativePath] = dependents.map((f) => this.getRelativePath(f));

			for (const dep of dependents) {
				affectedSet.add(dep);
			}
		}

		// Convert to relative paths and filter
		const allAffected = Array.from(affectedSet).map((f) => this.getRelativePath(f));
		const affectedTests = allAffected.filter((f) => this.isTestFile(f)).sort();

		return {
			changedFiles: absolutePaths.map((f) => this.getRelativePath(f)),
			affectedFiles: allAffected.sort(),
			affectedTests,
			graph,
		};
	}

	/**
	 * Extract property names that a file's exports might be exposed as
	 * e.g., LogsPanel class -> logsPanel property
	 */
	private extractPropertyNames(file: SourceFile): string[] {
		const names: string[] = [];

		// Get exported class names and convert to camelCase property names
		for (const classDecl of file.getClasses()) {
			if (classDecl.isExported()) {
				const className = classDecl.getName();
				if (className) {
					// Convert PascalCase to camelCase: LogsPanel -> logsPanel
					const propertyName = className.charAt(0).toLowerCase() + className.slice(1);
					names.push(propertyName);
				}
			}
		}

		return names;
	}

	/**
	 * Find all files that depend on a source file
	 * Stops at facades and switches to property-based search
	 */
	private findAllDependents(
		file: SourceFile,
		visited: Set<string>,
		propertyNames: string[],
	): string[] {
		const filePath = file.getFilePath();
		if (visited.has(filePath)) {
			return [];
		}
		visited.add(filePath);

		const dependents: string[] = [];

		// Get direct dependents (files that import this file)
		const directDependents = file.getReferencingSourceFiles();

		for (const dep of directDependents) {
			const depPath = dep.getFilePath();

			// If we hit a facade, stop import tracing and switch to property search
			if (this.facades.has(depPath)) {
				// Find tests that actually USE the property, not just import the facade
				const testsUsingProperty = this.findTestsUsingProperties(propertyNames);
				dependents.push(...testsUsingProperty);
				continue;
			}

			// Not a facade - continue normal import tracing
			dependents.push(depPath);

			// For the next level, track what property this file is exposed as
			const nextPropertyNames = this.extractPropertyNames(dep);
			const combinedProperties = [...propertyNames, ...nextPropertyNames];

			const transitiveDeps = this.findAllDependents(dep, visited, combinedProperties);
			dependents.push(...transitiveDeps);
		}

		return dependents;
	}

	/**
	 * Find test files that actually use the given property names
	 * Uses grep-style search for .propertyName. patterns
	 */
	private findTestsUsingProperties(propertyNames: string[]): string[] {
		if (propertyNames.length === 0) {
			return [];
		}

		const testsDir = path.join(PLAYWRIGHT_ROOT, 'tests');
		const matchingTests = new Set<string>();

		// Build regex pattern to match property access: .logsPanel. or .logsPanel)
		const patterns = propertyNames.map((name) => new RegExp(`\\.${name}[.)]`));

		// Recursively find all test files
		const testFiles = this.findTestFilesRecursive(testsDir);

		for (const testFile of testFiles) {
			try {
				const content = fs.readFileSync(testFile, 'utf-8');
				for (const pattern of patterns) {
					if (pattern.test(content)) {
						matchingTests.add(testFile);
						break;
					}
				}
			} catch {
				// File read error, skip
			}
		}

		return Array.from(matchingTests);
	}

	/**
	 * Recursively find all .spec.ts files in a directory
	 */
	private findTestFilesRecursive(dir: string): string[] {
		const results: string[] = [];

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					results.push(...this.findTestFilesRecursive(fullPath));
				} else if (entry.name.endsWith('.spec.ts')) {
					results.push(fullPath);
				}
			}
		} catch {
			// Directory read error, skip
		}

		return results;
	}

	/**
	 * Check if a file is a test file
	 */
	private isTestFile(relativePath: string): boolean {
		return (
			(relativePath.startsWith('tests/') || relativePath.includes('/tests/')) &&
			relativePath.endsWith('.spec.ts')
		);
	}

	/**
	 * Get relative path from playwright root
	 */
	private getRelativePath(absolutePath: string): string {
		return path.relative(PLAYWRIGHT_ROOT, absolutePath);
	}
}

/**
 * Format impact result for console output
 */
export function formatImpactConsole(result: ImpactResult, verbose = false): void {
	console.log('\n====================================');
	console.log('       IMPACT ANALYSIS REPORT');
	console.log('====================================\n');

	console.log(`Changed files: ${result.changedFiles.length}`);
	result.changedFiles.forEach((f) => console.log(`  - ${f}`));

	console.log(`\nAffected test files: ${result.affectedTests.length}`);
	if (result.affectedTests.length === 0) {
		console.log('  (none - changes do not affect any tests)');
	} else {
		result.affectedTests.forEach((f) => console.log(`  - ${f}`));
	}

	if (verbose) {
		console.log(`\nAll affected files: ${result.affectedFiles.length}`);
		result.affectedFiles.forEach((f) => console.log(`  - ${f}`));

		console.log('\nDependency graph:');
		for (const [file, deps] of Object.entries(result.graph)) {
			if (deps.length > 0) {
				console.log(`  ${file}:`);
				deps.forEach((d) => console.log(`    → ${d}`));
			}
		}
	}

	console.log('');
}

/**
 * Format impact result as JSON
 */
export function formatImpactJSON(result: ImpactResult): string {
	return JSON.stringify(result, null, 2);
}

/**
 * Format as simple list of test files (for piping to playwright)
 */
export function formatTestList(result: ImpactResult): string {
	return result.affectedTests.join('\n');
}
