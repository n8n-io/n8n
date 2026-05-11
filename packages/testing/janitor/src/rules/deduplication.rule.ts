import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { isComponentFile, getRelativePath } from '../utils/paths.js';

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
		const config = getConfig();
		return config.patterns.pages;
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const { pagesScope, componentsScope } = this.buildSelectorMaps(files);

		return [
			...this.findDuplicates(pagesScope, 'pages', files),
			...this.findDuplicates(componentsScope, 'components', files),
		];
	}

	private buildSelectorMaps(files: SourceFile[]): {
		pagesScope: Map<string, TestIdUsage[]>;
		componentsScope: Map<string, TestIdUsage[]>;
	} {
		const pagesScope = new Map<string, TestIdUsage[]>();
		const componentsScope = new Map<string, TestIdUsage[]>();

		for (const file of files) {
			const filePath = file.getFilePath();
			const scope = isComponentFile(filePath) ? componentsScope : pagesScope;
			this.collectTestIdUsages(file, scope);
		}

		return { pagesScope, componentsScope };
	}

	private collectTestIdUsages(file: SourceFile, scope: Map<string, TestIdUsage[]>): void {
		const filePath = file.getFilePath();
		const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

		for (const call of calls) {
			const usage = this.extractTestIdUsage(call, filePath);
			if (!usage) continue;

			const key = `${usage.root}:${usage.testId}`;
			const existing = scope.get(key) ?? [];
			existing.push({
				file: usage.file,
				line: usage.line,
				column: usage.column,
				root: usage.root,
			});
			scope.set(key, existing);
		}
	}

	private extractTestIdUsage(
		call: CallExpression,
		filePath: string,
	): (TestIdUsage & { testId: string }) | null {
		const expr = call.getExpression();
		const text = expr.getText();

		if (!text.endsWith('.getByTestId')) return null;

		const args = call.getArguments();
		if (args.length === 0) return null;

		const firstArg = args[0];
		if (firstArg.getKind() !== SyntaxKind.StringLiteral) return null;

		const stringLit = firstArg.asKind(SyntaxKind.StringLiteral);
		if (!stringLit) return null;

		return {
			file: filePath,
			line: call.getStartLineNumber(),
			column: call.getStart() - call.getStartLinePos(),
			root: this.extractLocatorRoot(text),
			testId: stringLit.getLiteralText(),
		};
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
		return root;
	}
}
