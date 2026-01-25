import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { getConfig } from '../janitor.config';

const PLAYWRIGHT_ROOT = path.join(__dirname, '..', '..', '..');

// ============================================================================
// Types
// ============================================================================

export interface MethodUsage {
	testFile: string;
	line: number;
	column: number;
	fullCall: string; // e.g., "n8n.canvas.addNode('Manual Trigger')"
}

export interface MethodUsageIndex {
	/** Map from "ClassName.methodName" to usage locations */
	methods: Record<string, MethodUsage[]>;
	/** Map from fixture property to class name (e.g., "canvas" → "CanvasPage") */
	fixtureMapping: Record<string, string>;
	/** Timestamp when index was built */
	timestamp: string;
	/** Number of test files analyzed */
	testFilesAnalyzed: number;
}

export interface MethodImpactResult {
	className: string;
	methodName: string;
	usages: MethodUsage[];
	affectedTestFiles: string[];
}

// ============================================================================
// Method Usage Analyzer
// ============================================================================

export class MethodUsageAnalyzer {
	private fixtureMapping: Record<string, string> = {};
	private config = getConfig();

	constructor(private project: Project) {}

	/**
	 * Build a complete index of method usages across all test files
	 */
	buildIndex(): MethodUsageIndex {
		// Step 1: Extract fixture property → class mapping from n8nPage
		this.fixtureMapping = this.extractFixtureMapping();

		// Step 2: Find all test files
		const testFiles = this.findTestFiles();

		// Step 3: Extract method calls from each test
		const methods: Record<string, MethodUsage[]> = {};

		for (const testFile of testFiles) {
			const usages = this.extractMethodUsages(testFile);

			for (const usage of usages) {
				const key = usage.key;
				if (!methods[key]) {
					methods[key] = [];
				}
				methods[key].push({
					testFile: usage.testFile,
					line: usage.line,
					column: usage.column,
					fullCall: usage.fullCall,
				});
			}
		}

		return {
			methods,
			fixtureMapping: this.fixtureMapping,
			timestamp: new Date().toISOString(),
			testFilesAnalyzed: testFiles.length,
		};
	}

	/**
	 * Find tests affected by a change to a specific method
	 */
	getMethodImpact(classAndMethod: string): MethodImpactResult {
		const [className, methodName] = this.parseClassMethod(classAndMethod);

		const index = this.buildIndex();
		const key = `${className}.${methodName}`;
		const usages = index.methods[key] || [];

		const affectedTestFiles = [...new Set(usages.map((u) => u.testFile))].sort();

		return {
			className,
			methodName,
			usages,
			affectedTestFiles,
		};
	}

	/**
	 * List all methods that have usages in tests
	 */
	listUsedMethods(): Array<{ method: string; usageCount: number; testFileCount: number }> {
		const index = this.buildIndex();

		return Object.entries(index.methods)
			.map(([method, usages]) => ({
				method,
				usageCount: usages.length,
				testFileCount: new Set(usages.map((u) => u.testFile)).size,
			}))
			.sort((a, b) => b.usageCount - a.usageCount);
	}

	// ==========================================================================
	// Fixture Mapping Extraction
	// ==========================================================================

	/**
	 * Parse n8nPage.ts to extract property name → class name mapping
	 * e.g., "canvas" → "CanvasPage", "workflows" → "WorkflowsPage"
	 */
	private extractFixtureMapping(): Record<string, string> {
		const mapping: Record<string, string> = {};

		// Find the n8nPage facade file
		const n8nPagePath = path.join(PLAYWRIGHT_ROOT, 'pages', 'n8nPage.ts');
		const sourceFile = this.project.getSourceFile(n8nPagePath);

		if (!sourceFile) {
			console.warn(`Warning: Could not find n8nPage.ts at ${n8nPagePath}`);
			return mapping;
		}

		// Find the n8nPage class
		const n8nPageClass = sourceFile.getClass('n8nPage');
		if (!n8nPageClass) {
			console.warn('Warning: Could not find n8nPage class');
			return mapping;
		}

		// Extract readonly properties with their types
		for (const prop of n8nPageClass.getProperties()) {
			const propName = prop.getName();
			const propType = prop.getType();
			const typeName = this.extractTypeName(propType.getText());

			if (typeName && typeName !== 'Page' && typeName !== 'ApiHelpers') {
				mapping[propName] = typeName;
			}
		}

		return mapping;
	}

	/**
	 * Extract simple type name from potentially complex type string
	 */
	private extractTypeName(typeText: string): string {
		// Remove import() paths: import("./CanvasPage").CanvasPage → CanvasPage
		const cleaned = typeText.replace(/import\([^)]+\)\./g, '');
		return cleaned;
	}

	// ==========================================================================
	// Test File Discovery
	// ==========================================================================

	/**
	 * Find all test files in the tests directory
	 */
	private findTestFiles(): string[] {
		const testsDir = path.join(PLAYWRIGHT_ROOT, 'tests');
		return this.findFilesRecursive(testsDir, '.spec.ts');
	}

	private findFilesRecursive(dir: string, suffix: string): string[] {
		const results: string[] = [];

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					results.push(...this.findFilesRecursive(fullPath, suffix));
				} else if (entry.name.endsWith(suffix)) {
					results.push(fullPath);
				}
			}
		} catch {
			// Directory read error, skip
		}

		return results;
	}

	// ==========================================================================
	// Method Usage Extraction
	// ==========================================================================

	/**
	 * Extract all fixture method calls from a test file
	 * Looks for patterns like: n8n.canvas.addNode(), n8n.workflows.create()
	 */
	private extractMethodUsages(
		testFilePath: string,
	): Array<{ key: string; testFile: string; line: number; column: number; fullCall: string }> {
		const usages: Array<{
			key: string;
			testFile: string;
			line: number;
			column: number;
			fullCall: string;
		}> = [];
		const relativePath = this.getRelativePath(testFilePath);

		try {
			const content = fs.readFileSync(testFilePath, 'utf-8');
			const lines = content.split('\n');

			// Regex to match n8n.<property>.<method>( patterns
			// Captures: property name, method name, and some context
			const fixtureObjectName = this.config.fixtureObjectName;
			const pattern = new RegExp(`${fixtureObjectName}\\.(\\w+)\\.(\\w+)\\s*\\(`, 'g');

			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				let match: RegExpExecArray | null;

				// Reset regex for each line
				pattern.lastIndex = 0;

				while ((match = pattern.exec(line)) !== null) {
					const propertyName = match[1];
					const methodName = match[2];

					// Look up the class name for this property
					const className = this.fixtureMapping[propertyName];
					if (!className) {
						// Not a known page object property, skip
						continue;
					}

					// Extract the full call (rough extraction for context)
					const callStart = match.index;
					const fullCall = this.extractFullCall(line, callStart);

					usages.push({
						key: `${className}.${methodName}`,
						testFile: relativePath,
						line: lineIndex + 1,
						column: match.index + 1,
						fullCall,
					});
				}
			}
		} catch {
			// File read error, skip
		}

		return usages;
	}

	/**
	 * Extract the full method call from a line for context
	 */
	private extractFullCall(line: string, startIndex: number): string {
		// Find a reasonable end point (closing paren or end of line)
		let depth = 0;
		let endIndex = startIndex;

		for (let i = startIndex; i < line.length; i++) {
			const char = line[i];
			if (char === '(') {
				depth++;
			} else if (char === ')') {
				depth--;
				if (depth === 0) {
					endIndex = i + 1;
					break;
				}
			}
		}

		if (endIndex === startIndex) {
			endIndex = Math.min(startIndex + 60, line.length);
		}

		const call = line.slice(startIndex, endIndex).trim();

		// Truncate if too long
		if (call.length > 80) {
			return call.slice(0, 77) + '...';
		}

		return call;
	}

	/**
	 * Parse "ClassName.methodName" or "methodName" input
	 */
	private parseClassMethod(input: string): [string, string] {
		const parts = input.split('.');
		if (parts.length === 2) {
			return [parts[0], parts[1]];
		}

		// If only method name provided, we can't determine the class
		throw new Error(
			`Invalid format: "${input}". Expected "ClassName.methodName" (e.g., "CanvasPage.addNode")`,
		);
	}

	private getRelativePath(absolutePath: string): string {
		return path.relative(PLAYWRIGHT_ROOT, absolutePath);
	}
}

// ============================================================================
// Output Formatters
// ============================================================================

export function formatMethodImpactConsole(result: MethodImpactResult, verbose = false): void {
	console.log('\n====================================');
	console.log('      METHOD IMPACT ANALYSIS');
	console.log('====================================\n');

	console.log(`Method: ${result.className}.${result.methodName}()`);
	console.log(`Total usages: ${result.usages.length}`);
	console.log(`Affected test files: ${result.affectedTestFiles.length}`);

	if (result.affectedTestFiles.length === 0) {
		console.log('\n  (no test files use this method)');
	} else {
		console.log('\nAffected tests:');
		for (const testFile of result.affectedTestFiles) {
			const usagesInFile = result.usages.filter((u) => u.testFile === testFile);
			console.log(`  - ${testFile} (${usagesInFile.length} usages)`);

			if (verbose) {
				for (const usage of usagesInFile) {
					console.log(`      L${usage.line}: ${usage.fullCall}`);
				}
			}
		}
	}

	console.log('');
}

export function formatMethodImpactJSON(result: MethodImpactResult): string {
	return JSON.stringify(result, null, 2);
}

export function formatMethodImpactTestList(result: MethodImpactResult): string {
	return result.affectedTestFiles.join('\n');
}

export function formatMethodUsageIndexConsole(index: MethodUsageIndex, limit = 20): void {
	console.log('\n====================================');
	console.log('       METHOD USAGE INDEX');
	console.log('====================================\n');

	console.log(`Test files analyzed: ${index.testFilesAnalyzed}`);
	console.log(`Unique methods tracked: ${Object.keys(index.methods).length}`);
	console.log(`Fixture properties mapped: ${Object.keys(index.fixtureMapping).length}`);

	console.log('\nTop used methods:');
	const sorted = Object.entries(index.methods)
		.map(([method, usages]) => ({ method, count: usages.length }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);

	for (const { method, count } of sorted) {
		console.log(`  ${method.padEnd(50)} ${count} usages`);
	}

	console.log('');
}

export function formatMethodUsageIndexJSON(index: MethodUsageIndex): string {
	return JSON.stringify(index, null, 2);
}
