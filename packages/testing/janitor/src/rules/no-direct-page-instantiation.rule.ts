/**
 * No Direct Page Instantiation Rule
 *
 * Enforces the facade pattern by preventing direct instantiation of page objects in test files.
 * Tests should access pages through the fixture object (e.g., n8n.canvas) instead of
 * creating new instances directly (e.g., new CanvasPage()).
 *
 * This rule is OPT-IN (disabled by default) since not all projects use the facade pattern.
 * Enable it in your janitor.config.ts:
 *
 * ```typescript
 * rules: {
 *   'no-direct-page-instantiation': { enabled: true }
 * }
 * ```
 *
 * Violations:
 * - `new CanvasPage(page)` in test files
 * - `new SettingsPage(...)` in test files
 *
 * Allowed:
 * - Page instantiation in fixture files (where the facade is set up)
 * - Page instantiation in page object files (for composition)
 * - Page instantiation in composables (if they need to create pages)
 */
import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { truncateText } from '../utils/ast-helpers.js';

export class NoDirectPageInstantiationRule extends BaseRule {
	readonly id = 'no-direct-page-instantiation';
	readonly name = 'No Direct Page Instantiation';
	readonly description =
		'Tests should access pages through the fixture facade, not instantiate directly';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		const config = getConfig();
		return config.patterns.tests;
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const newExpressions = file.getDescendantsOfKind(SyntaxKind.NewExpression);

			for (const newExpr of newExpressions) {
				const expr = newExpr.getExpression();
				const className = expr.getText();

				if (this.isPageInstantiation(className)) {
					if (this.isAllowed(className)) {
						continue;
					}

					const startLine = newExpr.getStartLineNumber();
					const startColumn = newExpr.getStart() - newExpr.getStartLinePos();
					const truncated = truncateText(newExpr.getText(), 60);

					violations.push(
						this.createViolation(
							file,
							startLine,
							startColumn,
							`Direct page instantiation: ${truncated}`,
							this.getSuggestion(className),
						),
					);
				}
			}
		}

		return violations;
	}

	/**
	 * Check if a class name looks like a page object instantiation
	 * Matches patterns like: CanvasPage, SettingsPage, WorkflowListPage, etc.
	 */
	private isPageInstantiation(className: string): boolean {
		// Match PascalCase names ending with "Page"
		return /^[A-Z][a-zA-Z]*Page$/.test(className);
	}

	private getSuggestion(className: string): string {
		const config = getConfig();
		const fixtureName = config.fixtureObjectName;

		// Convert CanvasPage -> canvas, SettingsPersonalPage -> settingsPersonal
		const propertyName = this.classNameToPropertyName(className);

		return `Access through ${fixtureName} facade: ${fixtureName}.${propertyName} instead of new ${className}()`;
	}

	/**
	 * Convert page class name to likely property name
	 * CanvasPage -> canvas
	 * SettingsPersonalPage -> settingsPersonal
	 */
	private classNameToPropertyName(className: string): string {
		// Remove 'Page' suffix
		const withoutPage = className.replace(/Page$/, '');
		// Convert PascalCase to camelCase
		return withoutPage.charAt(0).toLowerCase() + withoutPage.slice(1);
	}
}
