import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';
import { BaseRule } from './base-rule';
import type { Violation } from '../core/types';
import { LOCATOR_METHODS, PAGE_LEVEL_METHODS } from '../utils/ast-helpers';

/**
 * Selector Purity Rule
 *
 * Ensures composables and tests don't use direct page.locator() calls.
 * All selector interactions should go through page objects.
 *
 * Violations:
 * - n8n.page.getByTestId(), this.n8n.page.locator(), etc.
 * - page.getByTestId() in test files
 *
 * Exceptions (legitimate page-level operations):
 * - page.keyboard.*
 * - page.evaluate()
 * - page.reload()
 * - page.waitForURL()
 * - page.waitForLoadState()
 * - page.goto()
 *
 * Configuration:
 * - allowInExpect: Skip violations inside expect() calls (default: false)
 */
export class SelectorPurityRule extends BaseRule {
	readonly id = 'selector-purity';
	readonly name = 'Selector Purity';
	readonly description = 'Composables and tests should use page objects, not direct locators';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		return ['composables/**/*.ts', 'tests/**/*.ts'];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			// Find all call expressions
			const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of calls) {
				const expr = call.getExpression();
				const text = expr.getText();

				// Check for direct page locator patterns
				if (this.isDirectPageLocator(text)) {
					// Skip Playwright assertion methods (toBeVisible, etc.) even if expression contains page locators
					if (this.isPlaywrightAssertionCall(call)) {
						continue;
					}

					// Skip if it's inside an expect() call as argument
					// e.g., expect(this.n8n.canvas.getCanvasNodes().first()).toBeVisible()
					// But flag if the locator is constructed inside:
					// e.g., expect(this.n8n.page.getByTestId('x')).toBeVisible()
					if (this.isExpectWithPageObject(call)) {
						continue;
					}

					// Skip violations inside expect() if allowInExpect is enabled
					if (this.config.allowInExpect && this.isInsideExpect(call)) {
						continue;
					}

					const startLine = call.getStartLineNumber();
					const startColumn = call.getStart() - call.getStartLinePos();
					const truncated = this.truncateText(call.getText(), 60);

					// Determine the source pattern for better suggestion
					const suggestion = this.getSuggestion(text);

					violations.push(
						this.createViolation(
							file,
							startLine,
							startColumn,
							`Direct page locator call: ${truncated}`,
							suggestion,
						),
					);
				}
			}
		}

		return violations;
	}

	/**
	 * Check if expression is a direct page locator call
	 */
	private isDirectPageLocator(text: string): boolean {
		// Patterns to detect:
		// - this.n8n.page.getByTestId
		// - n8n.page.getByTestId
		// - this.page.getByTestId (in test files)
		// - page.getByTestId (in test files)

		for (const method of LOCATOR_METHODS) {
			// n8n.page.* patterns (composables)
			if (text.includes(`.n8n.page.${method}`)) {
				return true;
			}
			// Direct page.* patterns (tests)
			if (text.match(new RegExp(`(?<!\\w)page\\.${method}`))) {
				return true;
			}
			if (text.match(new RegExp(`this\\.page\\.${method}`))) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if the call is inside an expect() with a page object locator
	 * (as opposed to a direct page locator)
	 */
	private isExpectWithPageObject(call: ReturnType<SourceFile['getDescendantsOfKind']>[0]): boolean {
		const text = call.getText();

		// If the call itself uses page object (n8n.canvas, n8n.ndv, etc.)
		// and not direct page locator, it's fine
		if (!text.includes('.page.')) {
			return false;
		}

		// Check for legitimate page-level methods
		for (const method of PAGE_LEVEL_METHODS) {
			if (text.includes(`.page.${method}`)) {
				return true;
			}
		}

		return false;
	}

	/** Playwright assertion methods that chain after expect() */
	private static ASSERTION_METHODS = [
		'toBeVisible',
		'toBeHidden',
		'toBeEnabled',
		'toBeDisabled',
		'toBeChecked',
		'toBeEditable',
		'toBeEmpty',
		'toBeFocused',
		'toBeAttached',
		'toContainText',
		'toHaveText',
		'toHaveValue',
		'toHaveValues',
		'toHaveAttribute',
		'toHaveClass',
		'toHaveCount',
		'toHaveCSS',
		'toHaveId',
		'toHaveJSProperty',
		'toHaveScreenshot',
		'toHaveTitle',
		'toHaveURL',
		'not',
	];

	/**
	 * Check if the call is inside an expect() call
	 */
	private isInsideExpect(call: CallExpression): boolean {
		let current = call.getParent();
		while (current) {
			if (current.getKind() === SyntaxKind.CallExpression) {
				const callExpr = current.asKind(SyntaxKind.CallExpression);
				const exprText = callExpr?.getExpression().getText();
				if (exprText === 'expect') {
					return true;
				}
			}
			current = current.getParent();
		}
		return false;
	}

	/**
	 * Check if this call is a Playwright assertion method (toBeVisible, toHaveCount, etc.)
	 * These are chained after expect() and shouldn't be flagged even if their expression
	 * contains page locators.
	 */
	private isPlaywrightAssertionCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
			const propAccess = expr.asKind(SyntaxKind.PropertyAccessExpression);
			const methodName = propAccess?.getName();
			if (methodName && SelectorPurityRule.ASSERTION_METHODS.includes(methodName)) {
				// Verify this is chained from expect()
				const exprText = propAccess?.getExpression().getText() ?? '';
				if (exprText.startsWith('expect(') || exprText.startsWith('expect.')) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Get appropriate suggestion based on the pattern
	 */
	private getSuggestion(text: string): string {
		if (text.includes('.n8n.page.')) {
			return 'Use page object methods instead: this.n8n.canvas, this.n8n.ndv, etc.';
		}
		if (text.includes('page.getByTestId')) {
			return 'Use page object methods from n8n fixture instead of direct locators';
		}
		return 'Extract selector to appropriate page object class';
	}

	private truncateText(text: string, maxLength: number): string {
		const singleLine = text.replace(/\s+/g, ' ');
		if (singleLine.length <= maxLength) {
			return singleLine;
		}
		return singleLine.slice(0, maxLength - 3) + '...';
	}
}
