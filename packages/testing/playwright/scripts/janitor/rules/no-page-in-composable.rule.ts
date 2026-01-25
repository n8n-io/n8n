import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';
import { BaseRule } from './base-rule';
import type { Violation } from '../core/types';
import { getConfig } from '../janitor.config';

/**
 * No Page In Composable Rule
 *
 * Composables should interact ONLY through page objects, never directly
 * with this.n8n.page. This enforces the four-layer architecture:
 *
 *   Tests → Composables → Pages → BasePage
 *
 * Even "legitimate" page methods like keyboard, evaluate, reload should
 * be wrapped in page object helpers for composables.
 *
 * Why this matters:
 * - Keeps composables focused on high-level test workflows
 * - All DOM/page interaction is abstracted through page objects
 * - Makes tests more readable and maintainable
 *
 * Violations:
 * - this.n8n.page.anything()
 * - this.n8n.page (property access)
 *
 * This is stricter than selector-purity, which allows page-level methods
 * like keyboard, evaluate, etc. in both composables and tests.
 */
export class NoPageInComposableRule extends BaseRule {
	readonly id = 'no-page-in-flow';
	readonly name = 'No Page In Flow';
	readonly description =
		`${getConfig().flowLayerName}s should use page objects, not direct page access`;
	readonly severity = 'warning' as const;

	getTargetGlobs(): string[] {
		return getConfig().patterns.flows;
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];
		const config = getConfig();
		const fixtureName = config.fixtureObjectName;
		const flowLayerName = config.flowLayerName.toLowerCase();

		// Build regex to match this.<fixture>.page.<method>
		const pageAccessRegex = new RegExp(`^this\\.${fixtureName}\\.page\\.(\\w+)`);

		for (const file of files) {
			const propAccesses = file.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
			const flaggedPositions = new Set<string>();

			for (const propAccess of propAccesses) {
				const text = propAccess.getText();
				const match = text.match(pageAccessRegex);

				if (match) {
					// Check if this matches any allow patterns
					if (this.isAllowed(text)) {
						continue;
					}

					const startLine = propAccess.getStartLineNumber();
					const startColumn = propAccess.getStart() - propAccess.getStartLinePos();
					const posKey = `${startLine}:${startColumn}`;

					if (flaggedPositions.has(posKey)) {
						continue;
					}
					flaggedPositions.add(posKey);

					const methodName = match[1];

					violations.push(
						this.createViolation(
							file,
							startLine,
							startColumn,
							`Direct page access in ${flowLayerName}: this.${fixtureName}.page.${methodName}`,
							this.getSuggestion(methodName),
						),
					);
				}
			}
		}

		return violations;
	}

	/**
	 * Check if expression is direct page access (this.n8n.page.*)
	 */
	private isDirectPageAccess(text: string): boolean {
		// Match this.n8n.page followed by a method/property access
		// e.g., this.n8n.page.keyboard, this.n8n.page.getByTestId
		return /this\.n8n\.page\.\w+/.test(text);
	}

	/**
	 * Get appropriate suggestion based on the method being called
	 */
	private getSuggestion(methodName: string): string {
		if (methodName === 'keyboard') {
			return 'Create a helper method in the relevant page object for keyboard interactions';
		}
		if (methodName === 'evaluate') {
			return 'Create a helper method in the relevant page object for evaluate calls';
		}
		if (methodName === 'reload') {
			return 'Use a page object method to handle page reload with proper waiting';
		}
		if (methodName === 'goto') {
			return 'Use the page object navigation method instead';
		}
		if (methodName.startsWith('waitFor')) {
			return 'Use a page object method for waiting operations';
		}
		if (methodName === 'getByTestId' || methodName === 'locator' || methodName === 'getByRole') {
			return 'Use page object methods: this.n8n.canvas, this.n8n.ndv, etc.';
		}
		if (methodName === 'url') {
			return 'Use a page object method to check URL state';
		}
		return 'Wrap this page interaction in a page object method';
	}

	private truncateText(text: string, maxLength: number): string {
		const singleLine = text.replace(/\s+/g, ' ');
		if (singleLine.length <= maxLength) {
			return singleLine;
		}
		return singleLine.slice(0, maxLength - 3) + '...';
	}
}
