import { SyntaxKind, type Project, type SourceFile } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { LOCATOR_METHODS } from '../utils/ast-helpers.js';

/**
 * No Page In Flow Rule
 *
 * Flows/Composables should interact ONLY through page objects, never directly
 * with fixture.page. This enforces the four-layer architecture:
 *
 *   Tests → Flows/Composables → Pages → BasePage
 *
 * Even "legitimate" page methods like keyboard, evaluate, reload should
 * be wrapped in page object helpers for flows.
 *
 * Why this matters:
 * - Keeps flows focused on high-level test workflows
 * - All DOM/page interaction is abstracted through page objects
 * - Makes tests more readable and maintainable
 *
 * Violations:
 * - this.fixture.page.anything()
 * - this.fixture.page (property access)
 *
 * This is stricter than selector-purity, which allows page-level methods
 * like keyboard, evaluate, etc. in both composables and tests.
 */
export class NoPageInFlowRule extends BaseRule {
	readonly id = 'no-page-in-flow';
	readonly name = 'No Page In Flow';
	readonly severity = 'warning' as const;

	get description(): string {
		const config = getConfig();
		return `${config.flowLayerName}s should use page objects, not direct page access`;
	}

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
		if (LOCATOR_METHODS.includes(methodName)) {
			return 'Use page object methods instead of direct locators';
		}
		if (methodName === 'url') {
			return 'Use a page object method to check URL state';
		}
		return 'Wrap this page interaction in a page object method';
	}
}
