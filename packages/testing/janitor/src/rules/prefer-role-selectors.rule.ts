import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { truncateText } from '../utils/ast-helpers.js';
import { isExcludedPage } from '../utils/paths.js';

/**
 * Prefer Role Selectors Rule
 *
 * Flags `getByTestId(...)` calls in page object files and prompts the author to
 * check whether the element has an accessible role that would let the selector
 * be expressed as `getByRole(...)` instead.
 *
 * Role-based selectors mirror what assistive technology sees, so when one
 * can't be used the underlying UI is usually missing an accessible name or
 * role - a WCAG issue worth filing against the frontend component.
 *
 * The ratio of `getByRole` to `getByTestId` calls across page objects becomes
 * a useful proxy metric for accessibility coverage.
 *
 * Violations are emitted at every `getByTestId(...)` call in page object
 * files (excluding facades and base classes). Authors can silence individual
 * calls by adding the test id to the rule's `allowPatterns` config when the
 * element genuinely has no role equivalent.
 */
export class PreferRoleSelectorsRule extends BaseRule {
	readonly id = 'prefer-role-selectors';
	readonly name = 'Prefer Role Selectors';
	readonly description =
		'Page object getByTestId calls should be reviewed for getByRole equivalents';
	readonly severity = 'warning' as const;

	getTargetGlobs(): string[] {
		return getConfig().patterns.pages;
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

				const testId = this.getTestIdLiteral(call);
				if (testId !== undefined && this.isAllowed(testId)) {
					continue;
				}

				const startLine = call.getStartLineNumber();
				const startColumn = call.getStart() - call.getStartLinePos();
				const truncated = truncateText(call.getText(), 60);

				violations.push(
					this.createViolation(
						file,
						startLine,
						startColumn,
						`getByTestId selector: ${truncated}`,
						testId !== undefined
							? `Check if '${testId}' has an accessible role - prefer getByRole/getByLabel when available, or file a WCAG ticket for the frontend component`
							: 'Check if this element has an accessible role - prefer getByRole/getByLabel when available, or file a WCAG ticket for the frontend component',
					),
				);
			}
		}

		return violations;
	}

	private isGetByTestIdCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) {
			return false;
		}
		const propAccess = expr.asKind(SyntaxKind.PropertyAccessExpression);
		return propAccess?.getName() === 'getByTestId';
	}

	private getTestIdLiteral(call: CallExpression): string | undefined {
		const args = call.getArguments();
		if (args.length === 0) {
			return undefined;
		}

		const firstArg = args[0];
		if (firstArg.getKind() === SyntaxKind.StringLiteral) {
			return firstArg.asKind(SyntaxKind.StringLiteral)?.getLiteralText();
		}
		if (firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
			return firstArg.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)?.getLiteralText();
		}

		return undefined;
	}
}
