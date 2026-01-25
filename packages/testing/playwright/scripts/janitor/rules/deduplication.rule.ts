import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';
import { BaseRule } from './base-rule';
import type { Violation } from '../core/types';
import { isComponentFile } from '../utils/path-helpers';
import { getRelativePath } from '../core/project-loader';

interface TestIdUsage {
	file: string;
	line: number;
	column: number;
	root: string; // The locator root (e.g., "this.page", "this.container", "this.getPanel()")
}

/**
 * Deduplication Rule
 *
 * Ensures getByTestId() calls accessing the SAME DOM element are consolidated.
 * Uses AST analysis to determine the locator "root" - two calls are only duplicates
 * if they have the same root AND the same test ID.
 *
 * Examples:
 * - this.page.getByTestId('modal') in FileA and FileB → DUPLICATE (same root, same ID)
 * - this.container.getByTestId('view') vs this.page.getByTestId('view') → NOT duplicate
 * - this.getOutputPanel().getByTestId('view') vs this.getInputPanel().getByTestId('view') → NOT duplicate
 *
 * Scopes:
 * - pages/ (excluding components) = one scope
 * - pages/components/ = separate scope
 *
 * Only flags when the same {root}:{testId} combination appears in multiple files.
 */
export class DeduplicationRule extends BaseRule {
	readonly id = 'deduplication';
	readonly name = 'Deduplication';
	readonly description = 'Test IDs should be unique within their scope';
	readonly severity = 'warning' as const;

	getTargetGlobs(): string[] {
		return ['pages/**/*.ts'];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		// Collect test IDs by scope
		const pagesScope = new Map<string, TestIdUsage[]>();
		const componentsScope = new Map<string, TestIdUsage[]>();

		for (const file of files) {
			const filePath = file.getFilePath();
			const isComponent = isComponentFile(filePath);
			const scope = isComponent ? componentsScope : pagesScope;

			// Find all getByTestId calls with string literal arguments
			const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of calls) {
				const expr = call.getExpression();
				const text = expr.getText();

				// Only interested in getByTestId calls
				if (!text.endsWith('.getByTestId')) {
					continue;
				}

				const args = call.getArguments();
				if (args.length === 0) continue;

				const firstArg = args[0];
				if (firstArg.getKind() !== SyntaxKind.StringLiteral) continue;

				const stringLit = firstArg.asKind(SyntaxKind.StringLiteral);
				if (!stringLit) continue;

				const testId = stringLit.getLiteralText();
				const root = this.extractLocatorRoot(text);
				const usage: TestIdUsage = {
					file: filePath,
					line: call.getStartLineNumber(),
					column: call.getStart() - call.getStartLinePos(),
					root,
				};

				// Use root:testId as the deduplication key
				const key = `${root}:${testId}`;

				if (!scope.has(key)) {
					scope.set(key, []);
				}
				scope.get(key)!.push(usage);
			}
		}

		// Find duplicates in each scope
		violations.push(...this.findDuplicates(pagesScope, 'pages', files));
		violations.push(...this.findDuplicates(componentsScope, 'components', files));

		return violations;
	}

	private findDuplicates(
		scope: Map<string, TestIdUsage[]>,
		scopeName: string,
		files: SourceFile[],
	): Violation[] {
		const violations: Violation[] = [];

		for (const [key, usages] of scope) {
			// Only flag if same root:testId appears in multiple files
			const uniqueFiles = new Set(usages.map((u) => u.file));
			if (uniqueFiles.size <= 1) continue;

			// Extract testId from key (format: "root:testId")
			const testId = key.substring(key.lastIndexOf(':') + 1);
			const root = usages[0].root;

			// Create a violation for each usage except the first
			const sortedUsages = [...usages].sort((a, b) => a.file.localeCompare(b.file));
			const firstFile = getRelativePath(sortedUsages[0].file);

			for (let i = 1; i < sortedUsages.length; i++) {
				const usage = sortedUsages[i];
				const file = files.find((f) => f.getFilePath() === usage.file);
				if (!file) continue;

				violations.push(
					this.createViolation(
						file,
						usage.line,
						usage.column,
						`Duplicate locator: ${root}.getByTestId("${testId}") in ${scopeName} scope`,
						`Also used in ${firstFile}. Consider consolidating to a shared component.`,
					),
				);
			}
		}

		return violations;
	}

	/**
	 * Extract the locator root from a getByTestId call expression.
	 * E.g., "this.page.getByTestId" → "this.page"
	 *       "this.container.getByTestId" → "this.container"
	 *       "this.getPanel().getByTestId" → "this.getPanel()"
	 */
	private extractLocatorRoot(exprText: string): string {
		// Remove the trailing .getByTestId
		const root = exprText.replace(/\.getByTestId$/, '');

		// Normalize common patterns for better grouping
		// this.page.locator(...).* chains should be considered scoped
		if (root.includes('.locator(')) {
			return 'scoped'; // Mark as scoped - won't match other scoped calls
		}

		// Normalize method calls to include parentheses for clarity
		// e.g., "this.getPanel" should be "this.getPanel()" if it's a method
		return root;
	}
}
