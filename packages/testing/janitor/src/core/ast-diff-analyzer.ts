/**
 * AST Diff Analyzer - Detects which methods changed in a file
 *
 * Uses ts-morph to compare the current file against git HEAD,
 * identifying exactly which methods were added, removed, or modified.
 */

import { execFileSync } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project, type SourceFile, SyntaxKind } from 'ts-morph';

export interface MethodChange {
	className: string;
	methodName: string;
	changeType: 'added' | 'removed' | 'modified';
}

export interface FileDiffResult {
	filePath: string;
	changedMethods: MethodChange[];
	isNewFile: boolean;
	isDeletedFile: boolean;
	parseTimeMs: number;
}

/**
 * Get the git root directory
 */
function getGitRoot(): string {
	return execFileSync('git', ['rev-parse', '--show-toplevel'], {
		encoding: 'utf-8',
	}).trim();
}

/**
 * Get file content from git at a specific ref
 */
function getGitFileContent(filePath: string, ref: string = 'HEAD'): string | null {
	try {
		// Resolve to absolute path
		const absolutePath = path.resolve(filePath);

		// Get git root and make path relative to it
		const gitRoot = getGitRoot();
		const relativePath = path.relative(gitRoot, absolutePath);

		return execFileSync('git', ['show', `${ref}:${relativePath}`], {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
	} catch {
		return null; // File doesn't exist at that ref
	}
}

/**
 * Extract methods from a source file with their content hashes
 */
function extractMethods(sourceFile: SourceFile): Map<string, string> {
	const methods = new Map<string, string>();

	// Get all classes
	const classes = sourceFile.getClasses();

	for (const classDecl of classes) {
		const className = classDecl.getName() ?? 'AnonymousClass';

		// Get all methods (including getters/setters)
		const classMethods = classDecl.getMethods();
		for (const method of classMethods) {
			const methodName = method.getName();
			const key = `${className}.${methodName}`;
			// Hash the method body for comparison
			const bodyText = method.getText();
			const hash = crypto.createHash('md5').update(bodyText).digest('hex');
			methods.set(key, hash);
		}

		// Also check property declarations that are arrow functions
		const properties = classDecl.getProperties();
		for (const prop of properties) {
			const initializer = prop.getInitializer();
			if (initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
				const propName = prop.getName();
				const key = `${className}.${propName}`;
				const bodyText = initializer.getText();
				const hash = crypto.createHash('md5').update(bodyText).digest('hex');
				methods.set(key, hash);
			}
		}
	}

	return methods;
}

/**
 * Compare two versions of a file and return changed methods
 */
export function diffFileMethods(filePath: string, baseRef: string = 'HEAD'): FileDiffResult {
	const startTime = performance.now();

	// Get current file content
	const currentProject = new Project({ useInMemoryFileSystem: true });
	let currentSource: SourceFile;

	try {
		const currentContent = fs.readFileSync(filePath, 'utf-8');
		currentSource = currentProject.createSourceFile('current.ts', currentContent);
	} catch {
		// Current file doesn't exist (deleted)
		return {
			filePath,
			changedMethods: [],
			isNewFile: false,
			isDeletedFile: true,
			parseTimeMs: performance.now() - startTime,
		};
	}

	// Get base file content from git
	const baseContent = getGitFileContent(filePath, baseRef);

	if (baseContent === null) {
		// New file - all methods are "added"
		const currentMethods = extractMethods(currentSource);
		const changedMethods: MethodChange[] = [];

		for (const [key] of currentMethods) {
			const [className, methodName] = key.split('.');
			changedMethods.push({ className, methodName, changeType: 'added' });
		}

		return {
			filePath,
			changedMethods,
			isNewFile: true,
			isDeletedFile: false,
			parseTimeMs: performance.now() - startTime,
		};
	}

	// Parse base file
	const baseProject = new Project({ useInMemoryFileSystem: true });
	const baseSource = baseProject.createSourceFile('base.ts', baseContent);

	// Extract methods from both versions
	const baseMethods = extractMethods(baseSource);
	const currentMethods = extractMethods(currentSource);

	// Compare
	const changedMethods: MethodChange[] = [];

	// Check for modified or removed methods
	for (const [key, baseHash] of baseMethods) {
		const currentHash = currentMethods.get(key);
		const [className, methodName] = key.split('.');

		if (currentHash === undefined) {
			changedMethods.push({ className, methodName, changeType: 'removed' });
		} else if (currentHash !== baseHash) {
			changedMethods.push({ className, methodName, changeType: 'modified' });
		}
	}

	// Check for added methods
	for (const [key] of currentMethods) {
		if (!baseMethods.has(key)) {
			const [className, methodName] = key.split('.');
			changedMethods.push({ className, methodName, changeType: 'added' });
		}
	}

	return {
		filePath,
		changedMethods,
		isNewFile: false,
		isDeletedFile: false,
		parseTimeMs: performance.now() - startTime,
	};
}

/**
 * Format diff result for console output
 */
export function formatDiffConsole(result: FileDiffResult): void {
	console.log(`\nFile: ${result.filePath}`);
	console.log(`Parse time: ${result.parseTimeMs.toFixed(1)}ms`);

	if (result.isNewFile) {
		console.log('Status: New file');
	} else if (result.isDeletedFile) {
		console.log('Status: Deleted file');
	}

	if (result.changedMethods.length === 0) {
		console.log('No method changes detected');
		return;
	}

	console.log(`\nChanged methods (${result.changedMethods.length}):`);
	for (const change of result.changedMethods) {
		const symbol =
			change.changeType === 'added' ? '+' : change.changeType === 'removed' ? '-' : '~';
		console.log(`  ${symbol} ${change.className}.${change.methodName}`);
	}
}

/**
 * Format diff result as JSON
 */
export function formatDiffJSON(result: FileDiffResult): string {
	return JSON.stringify(result, null, 2);
}
