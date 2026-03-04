/**
 * Impact Analyzer
 *
 * Analyzes the impact of file changes - which tests need to run?
 * Uses import graph tracing with facade-aware property-based search.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type Project, type SourceFile } from 'ts-morph';

import { type FileDiffResult } from './ast-diff-analyzer.js';
import { FacadeResolver } from './facade-resolver.js';
import { getRootDir, findFilesRecursive, getRelativePath, isTestFile } from '../utils/paths.js';

function isAdditiveOnly(diff: FileDiffResult): boolean {
	if (diff.changedMethods.length === 0) return false;
	return diff.changedMethods.every((m) => m.changeType === 'added');
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
	private root: string;
	private facade: FacadeResolver;

	constructor(private project: Project) {
		this.root = getRootDir();
		this.facade = new FacadeResolver(project);
	}

	/**
	 * Given a list of changed files, determine which test files are affected.
	 * When diffs are provided, files with only additive changes (new methods)
	 * skip dependency tracing — new exports can't break existing consumers.
	 */
	analyze(changedFiles: string[], diffs?: FileDiffResult[]): ImpactResult {
		const absolutePaths = changedFiles.map((f) =>
			path.isAbsolute(f) ? f : path.join(this.root, f),
		);

		const diffMap = new Map<string, FileDiffResult>();
		if (diffs) {
			for (const diff of diffs) {
				diffMap.set(diff.filePath, diff);
			}
		}

		const affectedSet = new Set<string>();
		const graph: Record<string, string[]> = {};

		// For each changed file, find all files that depend on it
		for (const filePath of absolutePaths) {
			const sourceFile = this.project.getSourceFile(filePath);
			if (!sourceFile) {
				console.warn(`Warning: File not found in project: ${filePath}`);
				continue;
			}

			const relativePath = getRelativePath(filePath);

			// If the changed file is itself a test, it's affected
			if (isTestFile(relativePath)) {
				affectedSet.add(filePath);
			}

			// If we have diff info and all changes are additive, skip dependency tracing.
			// New exports can't break existing consumers.
			const diff = diffMap.get(filePath);
			if (diff && isAdditiveOnly(diff)) {
				continue;
			}

			// Find property names this file exposes (for property-based search)
			const propertyNames = this.extractPropertyNames(sourceFile);

			const dependents = this.findAllDependents(sourceFile, new Set(), propertyNames);

			graph[relativePath] = dependents.map((f) => getRelativePath(f));

			for (const dep of dependents) {
				affectedSet.add(dep);
			}
		}

		// Convert to relative paths and filter
		const allAffected = Array.from(affectedSet).map((f) => getRelativePath(f));
		const affectedTests = allAffected
			.filter((f) => isTestFile(f))
			.sort((a, b) => a.localeCompare(b));

		return {
			changedFiles: absolutePaths.map((f) => getRelativePath(f)),
			affectedFiles: allAffected.sort((a, b) => a.localeCompare(b)),
			affectedTests,
			graph,
		};
	}

	/**
	 * Extract property names that a file's exports are exposed as in the facade
	 * Uses the pre-built facade property map for accurate lookup
	 */
	private extractPropertyNames(file: SourceFile): string[] {
		const names: string[] = [];

		// Get exported class names and look up their property names in facade
		for (const classDecl of file.getClasses()) {
			if (classDecl.isExported()) {
				const className = classDecl.getName();
				if (className) {
					// Look up actual property name(s) from facade
					const facadeProps = this.facade.getPropertiesForClass(className);
					if (facadeProps.length > 0) {
						names.push(...facadeProps);
					} else {
						// Fallback to camelCase conversion if not in facade
						const propertyName = className.charAt(0).toLowerCase() + className.slice(1);
						names.push(propertyName);
					}
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
			if (this.facade.isFacade(depPath)) {
				// Resolve through multi-hop chains (page → facade → composable → test)
				const testsUsingProperty = this.resolvePropertyToTests(propertyNames, visited);
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
	 * Find all .ts files that use the given property names via text search.
	 * Searches the entire project root (not just tests/) to catch composables,
	 * helpers, and other intermediaries between the facade and tests.
	 */
	private findConsumersUsingProperties(propertyNames: string[]): string[] {
		if (propertyNames.length === 0) {
			return [];
		}

		const matchingFiles = new Set<string>();
		const facadePath = this.facade.getFacadePath();

		// Word-boundary regex: matches .name followed by any non-identifier char
		const patterns = propertyNames.map((name) => new RegExp(`\\.${name}(?![a-zA-Z0-9_])`));

		// Search all .ts files in the project root
		const allFiles = findFilesRecursive(this.root, '.ts');

		for (const file of allFiles) {
			// Skip the facade itself — it declares properties, doesn't consume them
			if (file === facadePath) continue;

			try {
				const content = fs.readFileSync(file, 'utf-8');
				for (const pattern of patterns) {
					if (pattern.test(content)) {
						matchingFiles.add(file);
						break;
					}
				}
			} catch {
				// File read error, skip
			}
		}

		return Array.from(matchingFiles);
	}

	/**
	 * Resolve property names to affected test files, following multi-hop chains.
	 *
	 * When a page changes and we hit the facade, the consumers might be:
	 * 1. Test files → add directly to results
	 * 2. Composables/helpers on the facade → extract THEIR property names, recurse
	 * 3. Non-facade files → import-trace via findAllDependents
	 *
	 * Example chain: MfaLoginPage → facade(mfaLogin) → MfaComposer(mfaLogin.*) →
	 *   facade(mfaComposer) → test(n8n.mfaComposer.*)
	 */
	private resolvePropertyToTests(
		propertyNames: string[],
		visited: Set<string>,
		resolvedConsumers: Set<string> = new Set(),
	): string[] {
		const consumers = this.findConsumersUsingProperties(propertyNames);
		const tests: string[] = [];

		for (const consumer of consumers) {
			// Guard against cyclic property chains (A→B→A)
			if (resolvedConsumers.has(consumer)) continue;
			resolvedConsumers.add(consumer);

			const relativePath = getRelativePath(consumer);

			if (isTestFile(relativePath)) {
				tests.push(consumer);
				continue;
			}

			// Non-test consumer (composable, helper, etc.)
			const sourceFile = this.project.getSourceFile(consumer);
			if (!sourceFile) continue;

			// Check if this file is exposed on the facade
			const consumerPropertyNames = this.extractPropertyNames(sourceFile);
			if (consumerPropertyNames.length > 0) {
				// File is on the facade — recurse with its property names
				const transitiveTests = this.resolvePropertyToTests(
					consumerPropertyNames,
					visited,
					resolvedConsumers,
				);
				tests.push(...transitiveTests);
			} else {
				// Not on the facade — fall back to import tracing
				const dependents = this.findAllDependents(sourceFile, visited, []);
				tests.push(...dependents);
			}
		}

		return tests;
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
