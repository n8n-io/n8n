/**
 * Impact Analyzer
 *
 * Analyzes the impact of file changes — which tests need to run?
 *
 * Decision flow per changed file:
 *   - New file / all methods added → SKIP (can't break existing tests)
 *   - Has modified/removed methods → METHOD-LEVEL (MethodUsageAnalyzer lookup)
 *   - No method changes detected (imports, types, comments) → PROPERTY-LEVEL fallback
 *
 * Method-level uses MethodUsageAnalyzer (fixture-pattern text search).
 * Property-level uses import graph tracing with facade-aware search.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type Project, type SourceFile } from 'ts-morph';

import { type FileDiffResult, type MethodChange } from './ast-diff-analyzer.js';
import { FacadeResolver } from './facade-resolver.js';
import { MethodUsageAnalyzer, type MethodUsageIndex } from './method-usage-analyzer.js';
import {
	findFilesRecursive,
	getRelativePath,
	getRootDir,
	isTestFile,
	resolvePath,
} from '../utils/paths.js';

export type ResolutionStrategy = 'method-level' | 'property-level' | 'skipped';

export interface AnalyzeOptions {
	diffs?: FileDiffResult[];
	methodUsageIndex?: MethodUsageIndex;
}

export interface ImpactResult {
	changedFiles: string[];
	affectedFiles: string[];
	affectedTests: string[];
	graph: Record<string, string[]>;
	strategies: Record<string, ResolutionStrategy>;
}

/**
 * Analyze the impact of file changes — what tests need to run?
 *
 * Single entry point used by both TCR and CI orchestration.
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
	 *
	 * Uses method-level precision when AST diffs show modified/removed methods,
	 * falls back to property-level import graph tracing otherwise.
	 */
	analyze(changedFiles: string[], options: AnalyzeOptions = {}): ImpactResult {
		const { diffs: precomputedDiffs, methodUsageIndex: precomputedIndex } = options;

		const affectedTests = new Set<string>();
		const affectedFilesSet = new Set<string>();
		const strategies: Record<string, ResolutionStrategy> = {};
		const graph: Record<string, string[]> = {};

		// Separate test files from source files
		const sourceFiles: string[] = [];
		const testFiles: string[] = [];

		for (const file of changedFiles) {
			const relative = getRelativePath(resolvePath(file));
			if (isTestFile(relative)) {
				testFiles.push(relative);
			} else if (file.endsWith('.ts')) {
				sourceFiles.push(file);
			}
		}

		// Include directly changed test files
		for (const testFile of testFiles) {
			affectedTests.add(testFile);
		}

		// Build diff map from pre-computed diffs (no diffs = property-level for all files)
		const diffMap = this.buildDiffMap(precomputedDiffs);

		// Lazy method usage index — only built if a file needs method-level resolution
		let methodIndex: MethodUsageIndex | undefined = precomputedIndex;
		const getMethodIndex = (): MethodUsageIndex => {
			methodIndex ??= new MethodUsageAnalyzer(this.project).buildIndex();
			return methodIndex;
		};

		for (const file of sourceFiles) {
			const abs = resolvePath(file);
			const relative = getRelativePath(resolvePath(file));
			const diff = diffMap.get(abs);

			if (!diff) {
				// No diff available — conservative property-level fallback
				strategies[relative] = 'property-level';
				this.resolvePropertyLevel(file, affectedTests, affectedFilesSet, graph);
				continue;
			}

			// New file or all methods added → skip (can't break existing tests)
			if (diff.isNewFile || this.isAllAdditive(diff)) {
				strategies[relative] = 'skipped';
				this.addTestsUsingNewMethods(
					diff.changedMethods.filter((m) => m.changeType === 'added'),
					testFiles,
					affectedTests,
				);
				continue;
			}

			// Has modified/removed methods → method-level resolution
			const modifiedOrRemoved = diff.changedMethods.filter((m) => m.changeType !== 'added');
			if (modifiedOrRemoved.length > 0) {
				strategies[relative] = 'method-level';
				const methodTests: string[] = [];
				for (const change of modifiedOrRemoved) {
					const key = `${change.className}.${change.methodName}`;
					const usages = getMethodIndex().methods[key] ?? [];
					for (const usage of usages) {
						affectedTests.add(usage.testFile);
						affectedFilesSet.add(usage.testFile);
						methodTests.push(usage.testFile);
					}
				}
				if (methodTests.length > 0) {
					graph[relative] = [...new Set(methodTests)].sort((a, b) => a.localeCompare(b));
				}
				// Also check for new methods referenced by changed test files
				const addedMethods = diff.changedMethods.filter((m) => m.changeType === 'added');
				this.addTestsUsingNewMethods(addedMethods, testFiles, affectedTests);
				continue;
			}

			// No method changes detected (imports, types, comments) → property-level fallback
			strategies[relative] = 'property-level';
			this.resolvePropertyLevel(file, affectedTests, affectedFilesSet, graph);
		}

		return {
			changedFiles: changedFiles.map((f) => getRelativePath(resolvePath(f))),
			affectedFiles: Array.from(affectedFilesSet).sort((a, b) => a.localeCompare(b)),
			affectedTests: Array.from(affectedTests).sort((a, b) => a.localeCompare(b)),
			graph,
			strategies,
		};
	}

	// --- Strategy Helpers ---

	private resolvePropertyLevel(
		file: string,
		affectedTests: Set<string>,
		affectedFilesSet: Set<string>,
		graph: Record<string, string[]>,
	): void {
		const abs = resolvePath(file);
		const relative = getRelativePath(resolvePath(file));
		const sourceFile = this.project.getSourceFile(abs);
		if (!sourceFile) return;

		const propertyNames = this.extractPropertyNames(sourceFile);
		const dependents = this.findAllDependents(sourceFile, new Set(), propertyNames);

		const depRelative = dependents.map((f) => getRelativePath(f));
		graph[relative] = depRelative;

		for (const dep of depRelative) {
			affectedFilesSet.add(dep);
			if (isTestFile(dep)) {
				affectedTests.add(dep);
			}
		}
	}

	private buildDiffMap(precomputedDiffs?: FileDiffResult[]): Map<string, FileDiffResult> {
		const map = new Map<string, FileDiffResult>();

		if (precomputedDiffs) {
			for (const diff of precomputedDiffs) {
				map.set(diff.filePath, diff);
			}
		}

		return map;
	}

	private static escapeRegex(value: string): string {
		return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	private isAllAdditive(diff: FileDiffResult): boolean {
		if (diff.changedMethods.length === 0) return false;
		return diff.changedMethods.every((m) => m.changeType === 'added');
	}

	private addTestsUsingNewMethods(
		addedMethods: MethodChange[],
		changedTestFiles: string[],
		affectedTests: Set<string>,
	): void {
		if (addedMethods.length === 0 || changedTestFiles.length === 0) return;

		for (const testFile of changedTestFiles) {
			const fullPath = path.join(this.root, testFile);
			const sourceFile = this.project.getSourceFile(fullPath);
			if (!sourceFile) continue;

			const content = sourceFile.getFullText();
			for (const method of addedMethods) {
				const methodPattern = new RegExp(
					`\\.${ImpactAnalyzer.escapeRegex(method.methodName)}\\s*\\(`,
				);
				if (methodPattern.test(content)) {
					affectedTests.add(testFile);
					break;
				}
			}
		}
	}

	// --- Import Graph Tracing (property-level internals) ---

	/**
	 * Extract property names that a file's exports are exposed as in the facade
	 */
	private extractPropertyNames(file: SourceFile): string[] {
		const names: string[] = [];

		for (const classDecl of file.getClasses()) {
			if (classDecl.isExported()) {
				const className = classDecl.getName();
				if (className) {
					const facadeProps = this.facade.getPropertiesForClass(className);
					if (facadeProps.length > 0) {
						names.push(...facadeProps);
					} else {
						const propertyName = className.charAt(0).toLowerCase() + className.slice(1);
						names.push(propertyName);
					}
				}
			}
		}

		return names;
	}

	/**
	 * Find all files that depend on a source file.
	 * Stops at facades and switches to property-based search.
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
		const directDependents = file.getReferencingSourceFiles();

		for (const dep of directDependents) {
			const depPath = dep.getFilePath();

			if (this.facade.isFacade(depPath)) {
				const testsUsingProperty = this.resolvePropertyToTests(propertyNames, visited);
				dependents.push(...testsUsingProperty);
				continue;
			}

			dependents.push(depPath);

			const nextPropertyNames = this.extractPropertyNames(dep);
			const combinedProperties = [...propertyNames, ...nextPropertyNames];

			const transitiveDeps = this.findAllDependents(dep, visited, combinedProperties);
			dependents.push(...transitiveDeps);
		}

		return dependents;
	}

	private findConsumersUsingProperties(propertyNames: string[]): string[] {
		if (propertyNames.length === 0) {
			return [];
		}

		const matchingFiles = new Set<string>();
		const facadePath = this.facade.getFacadePath();
		const patterns = propertyNames.map(
			(name) => new RegExp(`\\.${ImpactAnalyzer.escapeRegex(name)}(?![a-zA-Z0-9_])`),
		);
		const allFiles = findFilesRecursive(this.root, '.ts');

		for (const file of allFiles) {
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

	private resolvePropertyToTests(
		propertyNames: string[],
		visited: Set<string>,
		resolvedConsumers: Set<string> = new Set(),
	): string[] {
		const consumers = this.findConsumersUsingProperties(propertyNames);
		const tests: string[] = [];

		for (const consumer of consumers) {
			if (resolvedConsumers.has(consumer)) continue;
			resolvedConsumers.add(consumer);

			const relativePath = getRelativePath(consumer);

			if (isTestFile(relativePath)) {
				tests.push(consumer);
				continue;
			}

			const sourceFile = this.project.getSourceFile(consumer);
			if (!sourceFile) continue;

			const consumerPropertyNames = this.extractPropertyNames(sourceFile);
			if (consumerPropertyNames.length > 0) {
				const transitiveTests = this.resolvePropertyToTests(
					consumerPropertyNames,
					visited,
					resolvedConsumers,
				);
				tests.push(...transitiveTests);
			} else {
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
