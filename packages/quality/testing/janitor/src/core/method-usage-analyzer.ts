/**
 * Method Usage Analyzer - Builds index of page object method usages in tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type Project } from 'ts-morph';

import { getConfig } from '../config.js';
import { FacadeResolver } from './facade-resolver.js';
import { getRootDir, findFilesRecursive, getRelativePath } from '../utils/paths.js';

export interface MethodUsage {
	testFile: string;
	line: number;
	column: number;
	fullCall: string;
}

export interface MethodUsageIndex {
	methods: Record<string, MethodUsage[]>;
	fixtureMapping: Record<string, string>;
	timestamp: string;
	testFilesAnalyzed: number;
}

export interface MethodImpactResult {
	className: string;
	methodName: string;
	usages: MethodUsage[];
	affectedTestFiles: string[];
}

export class MethodUsageAnalyzer {
	private facade: FacadeResolver;
	private fixtureMapping: Record<string, string> = {};

	constructor(project: Project) {
		this.facade = new FacadeResolver(project);
	}

	buildIndex(): MethodUsageIndex {
		this.fixtureMapping = this.facade.getPropertyToClassMap();
		const testFiles = this.findTestFiles();
		const methods: Record<string, MethodUsage[]> = {};

		for (const testFile of testFiles) {
			const usages = this.extractMethodUsages(testFile);

			for (const usage of usages) {
				const key = usage.key;
				if (!methods[key]) methods[key] = [];
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

	getMethodImpact(classAndMethod: string): MethodImpactResult {
		const [className, methodName] = this.parseClassMethod(classAndMethod);
		const index = this.buildIndex();
		const key = `${className}.${methodName}`;
		const usages = index.methods[key] || [];
		const affectedTestFiles = [...new Set(usages.map((u) => u.testFile))].sort((a, b) =>
			a.localeCompare(b),
		);

		return { className, methodName, usages, affectedTestFiles };
	}

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

	private findTestFiles(): string[] {
		const root = getRootDir();
		const testsDir = path.join(root, 'tests');
		return findFilesRecursive(testsDir, '.spec.ts');
	}

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
		const config = getConfig();
		const relativePath = getRelativePath(testFilePath);

		try {
			const content = fs.readFileSync(testFilePath, 'utf-8');
			const lines = content.split('\n');
			const fixtureObjectName = config.fixtureObjectName;
			const pattern = new RegExp(`${fixtureObjectName}\\.(\\w+)\\.(\\w+)\\s*\\(`, 'g');

			for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
				const line = lines[lineIndex];
				let match: RegExpExecArray | null;
				pattern.lastIndex = 0;

				while ((match = pattern.exec(line)) !== null) {
					const propertyName = match[1];
					const methodName = match[2];
					const className = this.fixtureMapping[propertyName];
					if (!className) continue;

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
			// Skip files that can't be read
		}

		return usages;
	}

	private extractFullCall(line: string, startIndex: number): string {
		let depth = 0;
		let endIndex = startIndex;

		for (let i = startIndex; i < line.length; i++) {
			const char = line[i];
			if (char === '(') depth++;
			else if (char === ')') {
				depth--;
				if (depth === 0) {
					endIndex = i + 1;
					break;
				}
			}
		}

		if (endIndex === startIndex) endIndex = Math.min(startIndex + 60, line.length);

		const call = line.slice(startIndex, endIndex).trim();
		return call.length > 80 ? call.slice(0, 77) + '...' : call;
	}

	private parseClassMethod(input: string): [string, string] {
		const parts = input.split('.');
		if (parts.length === 2) return [parts[0], parts[1]];

		throw new Error(
			`Invalid format: "${input}". Expected "ClassName.methodName" (e.g., "CanvasPage.addNode")`,
		);
	}
}

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
