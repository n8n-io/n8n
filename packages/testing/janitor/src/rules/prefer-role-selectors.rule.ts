import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { getTestIdArgument, truncateText } from '../utils/ast-helpers.js';
import { isExcludedPage } from '../utils/paths.js';

/**
 * Prefer Role Selectors Rule
 *
 * Flags `getByTestId(...)` calls in page objects where a `getByRole(...)`
 * equivalent may exist. The intent is to nudge authors toward role-based
 * selectors, which:
 *
 * - Make tests easier to write and maintain.
 * - Surface accessibility gaps at test-authoring time: if a test cannot
 *   use `getByRole`, the underlying UI element likely fails WCAG and the
 *   frontend component should be fixed.
 *
 * The ratio of `getByRole` to `getByTestId` in page objects becomes a
 * proxy metric for UI accessibility coverage.
 *
 * Scope:
 * - Page objects only (config.patterns.pages). Components are included
 *   because they wrap accessible UI primitives just as much as pages do.
 *
 * Severity:
 * - Warning. The rule cannot prove that a role-based selector exists for
 *   a given test ID — it only surfaces the candidate for review.
 *
 * Configuration:
 * - `allowPatterns`: RegExp[] matched against the test ID string. Use
 *   this to suppress test IDs that intentionally cannot use roles
 *   (e.g. internal layout primitives with no semantic role).
 */
export class PreferRoleSelectorsRule extends BaseRule {
	readonly id = 'prefer-role-selectors';
	readonly name = 'Prefer Role Selectors';
	readonly description =
		'Page objects should prefer getByRole over getByTestId where an accessible role exists';
	readonly severity = 'warning' as const;

	getTargetGlobs(): string[] {
		const config = getConfig();
		return config.patterns.pages;
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const filePath = file.getFilePath();

			if (isExcludedPage(filePath)) {
				continue;
			}

			const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of calls) {
				if (!this.isGetByTestIdCall(call)) {
					continue;
				}

				const testId = getTestIdArgument(call);
				if (testId && this.isAllowed(testId)) {
					continue;
				}

				const startLine = call.getStartLineNumber();
				const startColumn = call.getStart() - call.getStartLinePos();
				const truncated = truncateText(call.getText(), 60);

				const message = testId
					? `getByTestId("${testId}") — consider getByRole if the element has an accessible role`
					: `getByTestId call — consider getByRole if the element has an accessible role: ${truncated}`;

				violations.push(
					this.createViolation(
						file,
						startLine,
						startColumn,
						message,
						'Review whether the element exposes an accessible role. If yes, prefer getByRole. If no, file a frontend accessibility issue against the component.',
					),
				);
			}
		}

		return violations;
	}

	/**
	 * True when the call is a `.getByTestId(...)` invocation. Works for
	 * any receiver (page, container, returned locators, helper calls).
	 */
	private isGetByTestIdCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) {
			return false;
		}
		const propAccess = expr.asKind(SyntaxKind.PropertyAccessExpression);
		return propAccess?.getName() === 'getByTestId';
	}
}
