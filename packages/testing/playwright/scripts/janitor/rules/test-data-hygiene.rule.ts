import { type Project, type SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import { BaseRule } from './base-rule';
import type { Violation, FixResult } from '../core/types';
import { getConfig } from '../janitor.config';

const PLAYWRIGHT_ROOT = path.join(__dirname, '..', '..', '..');

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
export class TestDataHygieneRule extends BaseRule {
	readonly id = 'test-data-hygiene';
	readonly name = 'Test Data Hygiene';
	readonly description = 'Ensure test data files are well-named and actually used';
	readonly severity = 'warning' as const;
	readonly fixable = true;

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
		// We analyze test files to find references, not the data files themselves
		return ['tests/**/*.ts', 'composables/**/*.ts'];
	}

	analyze(project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];
		const config = getConfig();

		// Get all test data files
		const testDataFiles = this.getTestDataFiles(config.patterns.testData);

		// Build reference index from test files
		const references = this.buildReferenceIndex(files);

		for (const dataFile of testDataFiles) {
			const relativePath = path.relative(PLAYWRIGHT_ROOT, dataFile);
			const fileName = path.basename(dataFile);
			const dirName = path.dirname(relativePath);

			// Check naming
			const namingViolation = this.checkNaming(fileName, relativePath);
			if (namingViolation) {
				violations.push(namingViolation);
			}

			// Check if orphaned
			const isOrphaned = this.isOrphaned(relativePath, fileName, dirName, references);
			if (isOrphaned) {
				violations.push(
					this.createViolationForFile(
						relativePath,
						`Orphaned test data: ${fileName} is not referenced in any test`,
						'Remove the file or add a test that uses it',
						true, // fixable
						{ type: 'orphan', filePath: dataFile },
					),
				);
			}
		}

		return violations;
	}

	private getTestDataFiles(patterns: string[]): string[] {
		const files: string[] = [];

		for (const pattern of patterns) {
			const matches = glob.sync(pattern, { cwd: PLAYWRIGHT_ROOT, nodir: true, absolute: true });
			files.push(...matches);
		}

		return files;
	}

	private buildReferenceIndex(files: SourceFile[]): {
		fileNames: Set<string>;
		folderNames: Set<string>;
	} {
		const fileNames = new Set<string>();
		const folderNames = new Set<string>();

		for (const file of files) {
			const content = file.getText();

			// Find workflow imports: import('workflows/name.json') or .import('name.json')
			const workflowMatches = content.matchAll(/['"`]([^'"`]*\.json)['"`]/g);
			for (const match of workflowMatches) {
				const fileName = path.basename(match[1]);
				fileNames.add(fileName);
			}

			// Find expectation folder loads: loadExpectations('folder-name')
			const expectationMatches = content.matchAll(/loadExpectations\s*\(\s*['"`]([^'"`]+)['"`]/g);
			for (const match of expectationMatches) {
				folderNames.add(match[1]);
			}
		}

		return { fileNames, folderNames };
	}

	private checkNaming(fileName: string, relativePath: string): Violation | null {
		// Skip checking expectations - they're auto-generated
		if (relativePath.startsWith('expectations/')) {
			return null;
		}

		for (const pattern of this.badNamePatterns) {
			if (pattern.test(fileName)) {
				return this.createViolationForFile(
					relativePath,
					`Poorly named test data: ${fileName}`,
					'Use a descriptive name like "webhook-with-wait.json" or "ai-agent-tool-call.json"',
				);
			}
		}

		return null;
	}

	private isOrphaned(
		relativePath: string,
		fileName: string,
		dirName: string,
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
		message: string,
		suggestion: string,
		fixable?: boolean,
		fixData?: Record<string, unknown>,
	): Violation {
		return {
			file: path.join(PLAYWRIGHT_ROOT, relativePath),
			line: 1,
			column: 0,
			rule: this.id,
			message,
			severity: this.severity,
			suggestion,
			fixable,
			fixData,
		};
	}

	fix(_project: Project, violations: Violation[], write: boolean): FixResult[] {
		const results: FixResult[] = [];

		for (const violation of violations) {
			if (!violation.fixable || !violation.fixData) continue;

			const fixData = violation.fixData as { type: string; filePath: string };
			if (fixData.type !== 'orphan') continue;

			const filePath = fixData.filePath;
			const relativePath = path.relative(PLAYWRIGHT_ROOT, filePath);

			results.push({
				file: relativePath,
				action: 'remove-file',
				target: path.basename(filePath),
				applied: write,
			});

			if (write && fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		}

		return results;
	}
}
