import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import * as path from 'node:path';
import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';

import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { getRootDir, getTestDataFiles } from '../utils/paths.js';

/**
 * Test Data Hygiene Rule
 *
 * Ensures test data files (workflows, expectations, etc.) are:
 * 1. Well-named (descriptive, not generic or hash-based)
 * 2. Actually used (not orphaned)
 *
 * Naming violations:
 * - Generic names: Test_workflow_1.json, test.json, data.json
 * - Ticket-only names: cat-1801.json (no description)
 * - Hash/timestamp names: 1766027608058-...-2ef5ce20.json
 *
 * Orphan detection:
 * - Workflows: filename must be referenced in test files
 * - Expectations: folder must be referenced via loadExpectations()
 */
export class TestDataHygieneRule extends AstRule<{ rootDir: string }> {
	readonly id = 'test-data-hygiene';
	readonly name = 'Test Data Hygiene';
	readonly description = 'Ensure test data files are well-named and actually used';
	readonly severity = 'warning' as const;

	// Patterns that indicate poor naming
	private readonly badNamePatterns = [
		// Generic names
		/^test[_-]?\d*\.json$/i,
		/^data[_-]?\d*\.json$/i,
		/^workflow[_-]?\d*\.json$/i,
		/^Test_workflow_\d+\.json$/,
		// Ticket-only names (e.g., cat-1801.json, CAT-123.json)
		/^[a-z]{2,5}[_-]\d+\.json$/i,
		// Timestamp/hash soup (proxy-generated)
		/^\d{10,}-.*-[a-f0-9]{6,}\.json$/i,
	];

	// Folders that use folder-based loading (expectations)
	private readonly folderBasedPaths = ['expectations'];

	getTargetGlobs(): string[] {
		const config = getConfig();
		// We analyze test files, flows, fixtures, and helpers to find references
		return [
			...config.patterns.tests,
			...config.patterns.flows,
			...config.patterns.fixtures,
			...config.patterns.helpers,
		];
	}

	protected projectConfig(): AstProjectConfig {
		return { packages: ['.'], spec: { globs: this.getTargetGlobs() } };
	}

	analyze(context: { rootDir: string }): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	analyzeProject(project: Project, _files?: SourceFile[]): Violation[] {
		const violations: Violation[] = [];
		const config = getConfig();
		const root = getRootDir();

		// Get all test data files
		const testDataFiles = getTestDataFiles(config.patterns.testData);

		// Always load ALL test/flow/fixture/helper files for reference checking
		// This ensures orphan detection works correctly even in targeted file mode (TCR)
		const allReferenceGlobs = [
			...config.patterns.tests,
			...config.patterns.flows,
			...config.patterns.fixtures,
			...config.patterns.helpers,
		];
		const allReferenceFiles = this.loadAllFiles(project, allReferenceGlobs, root);

		// Build reference index from ALL test files
		const references = this.buildReferenceIndex(allReferenceFiles);

		for (const dataFile of testDataFiles) {
			const relativePath = path.relative(root, dataFile);
			const fileName = path.basename(dataFile);
			const dirName = path.dirname(relativePath);

			// Check naming
			const namingViolation = this.checkNaming(fileName, relativePath, root);
			if (namingViolation) {
				violations.push(namingViolation);
			}

			// Check if orphaned
			const isOrphaned = this.isOrphaned(relativePath, fileName, dirName, references);
			if (isOrphaned) {
				violations.push(
					this.createViolationForFile(
						relativePath,
						root,
						`Orphaned test data: ${fileName} is not referenced in any test`,
						'Remove the file or add a test that uses it',
					),
				);
			}
		}

		return violations;
	}

	private buildReferenceIndex(files: SourceFile[]): {
		fileNames: Set<string>;
		folderNames: Set<string>;
	} {
		const fileNames = new Set<string>();
		const folderNames = new Set<string>();

		for (const file of files) {
			// Use AST to find actual string literals (excludes comments)
			const stringLiterals = file.getDescendantsOfKind(SyntaxKind.StringLiteral);

			for (const literal of stringLiterals) {
				const value = literal.getLiteralText();

				// Check for .json file references
				if (value.endsWith('.json')) {
					const fileName = path.basename(value);
					fileNames.add(fileName);
				}

				// Check for loadExpectations calls
				const parent = literal.getParent();
				if (parent?.isKind(SyntaxKind.CallExpression)) {
					const callExpr = parent.asKindOrThrow(SyntaxKind.CallExpression);
					const exprText = callExpr.getExpression().getText();
					if (exprText.endsWith('loadExpectations')) {
						folderNames.add(value);
					}
				}
			}
		}

		return { fileNames, folderNames };
	}

	private checkNaming(fileName: string, relativePath: string, _root: string): Violation | null {
		// Skip checking expectations - they're auto-generated
		if (relativePath.startsWith('expectations/')) {
			return null;
		}

		for (const pattern of this.badNamePatterns) {
			if (pattern.test(fileName)) {
				return this.createViolationForFile(
					relativePath,
					getRootDir(),
					`Poorly named test data: ${fileName}`,
					'Use a descriptive name like "webhook-with-wait.json" or "ai-agent-tool-call.json"',
				);
			}
		}

		return null;
	}

	private loadAllFiles(project: Project, globs: string[], root: string): SourceFile[] {
		const files: SourceFile[] = [];
		for (const glob of globs) {
			const absoluteGlob = path.join(root, glob);
			const added = project.addSourceFilesAtPaths(absoluteGlob);
			files.push(...added);
		}
		// Deduplicate
		const uniqueFiles = new Map<string, SourceFile>();
		for (const file of files) {
			uniqueFiles.set(file.getFilePath(), file);
		}
		return Array.from(uniqueFiles.values());
	}

	private isOrphaned(
		relativePath: string,
		fileName: string,
		_dirName: string,
		references: { fileNames: Set<string>; folderNames: Set<string> },
	): boolean {
		// Check if this is a folder-based path (expectations)
		const isFolderBased = this.folderBasedPaths.some((p) => relativePath.startsWith(p + '/'));

		if (isFolderBased) {
			// For expectations, check if the immediate parent folder is referenced
			// expectations/langchain/file.json -> check for 'langchain'
			const parts = relativePath.split('/');
			if (parts.length >= 2) {
				const expectationFolder = parts[1]; // e.g., 'langchain'
				return !references.folderNames.has(expectationFolder);
			}
		}

		// For workflows and other files, check if filename is referenced
		return !references.fileNames.has(fileName);
	}

	private createViolationForFile(
		relativePath: string,
		root: string,
		message: string,
		suggestion: string,
	): Violation {
		return {
			file: path.join(root, relativePath),
			line: 1,
			column: 0,
			rule: this.id,
			message,
			severity: this.severity,
			suggestion,
		};
	}
}
