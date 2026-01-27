import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { LOCATOR_METHODS, PAGE_LEVEL_METHODS, truncateText } from '../utils/ast-helpers.js';

/**
 * Selector Purity Rule
 *
 * Ensures composables and tests don't use direct page.locator() calls.
 * All selector interactions should go through page objects.
 *
 * Violations:
 * - fixture.page.getByTestId(), this.fixture.page.locator(), etc.
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
		const config = getConfig();
		return [...config.patterns.flows, ...config.patterns.tests];
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
					// Skip Playwright assertion methods (toBeVisible, etc.)
					if (this.isPlaywrightAssertionCall(call)) {
						continue;
					}

					// Skip if it's inside an expect() call with page object
					if (this.isExpectWithPageObject(call)) {
						continue;
					}

					// Skip violations inside expect() if allowInExpect is enabled
					// Check both runtime config and config file settings
					const ruleSettings = getConfig().rules?.[this.id];
					const allowInExpect = this.config.allowInExpect ?? ruleSettings?.allowInExpect;
					if (allowInExpect && this.isInsideExpect(call)) {
						continue;
					}

					const startLine = call.getStartLineNumber();
					const startColumn = call.getStart() - call.getStartLinePos();
					const truncated = truncateText(call.getText(), 60);

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
		const config = getConfig();
		const fixtureName = config.fixtureObjectName;

		for (const method of LOCATOR_METHODS) {
			// Fixture.page.* patterns (e.g., app.page.getByTestId)
			if (text.includes(`.${fixtureName}.page.${method}`)) {
				return true;
			}
			// Direct page.* patterns (tests)
			const directPagePattern = new RegExp(`(?<!\\w)page\\.${method}`);
			if (directPagePattern.test(text)) {
				return true;
			}
			const thisPagePattern = new RegExp(`this\\.page\\.${method}`);
			if (thisPagePattern.test(text)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if the call is inside an expect() with a page object locator
	 */
	private isExpectWithPageObject(call: ReturnType<SourceFile['getDescendantsOfKind']>[0]): boolean {
		const text = call.getText();

		// If the call itself uses page object and not direct page locator, it's fine
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
	 * Check if this call is a Playwright assertion method
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
		const config = getConfig();
		const fixtureName = config.fixtureObjectName;

		if (text.includes(`.${fixtureName}.page.`)) {
			return `Use page object methods instead: ${fixtureName}.<pageObject>.<method>()`;
		}
		if (text.includes('page.getByTestId')) {
			return `Use page object methods from ${fixtureName} fixture instead of direct locators`;
		}
		return 'Extract selector to appropriate page object class';
	}
}
