import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { getMethodName, truncateText } from '../utils/ast-helpers.js';
import { isExcludedPage } from '../utils/paths.js';

/**
 * Prefer Role Selectors Rule
 *
 * Flags `getByTestId(...)` usage inside page object files and suggests reviewing
 * whether the element exposes an accessible role that would allow `getByRole(...)`.
 *
 * Why this matters:
 * - `getByRole` selectors are more resilient than `data-testid` because they
 *   describe the element by its semantic contract instead of an implementation detail.
 * - When a test cannot use `getByRole`, the underlying component likely lacks an
 *   accessible role — a WCAG gap worth filing against the frontend.
 *
 * The ratio of `getByRole` to `getByTestId` calls across page objects becomes a
 * proxy metric for UI accessibility coverage.
 *
 * Targets:
 * - Page object files (including components), excluding facades and base classes.
 *
 * Notes:
 * - This rule is heuristic. It cannot prove a role selector exists, so violations
 *   are surfaced for human review.
 */
export class PreferRoleSelectorsRule extends BaseRule {
	readonly id = 'prefer-role-selectors';
	readonly name = 'Prefer Role Selectors';
	readonly description =
		'Page objects should prefer getByRole over getByTestId where an accessible role exists';
	readonly severity = 'warning' as const;

	getTargetGlobs(): string[] {
		const config = getConfig();
		return [...config.patterns.pages, ...config.patterns.components];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			if (isExcludedPage(file.getFilePath())) {
				continue;
			}

			const calls = file.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of calls) {
				if (!this.isGetByTestIdCall(call)) {
					continue;
				}

				if (this.isAllowed(call.getText())) {
					continue;
				}

				const line = call.getStartLineNumber();
				const column = call.getStart() - call.getStartLinePos();
				const truncated = truncateText(call.getText(), 60);

				violations.push(
					this.createViolation(
						file,
						line,
						column,
						`getByTestId in page object: ${truncated}`,
						'Prefer getByRole/getByLabel/getByText when the element exposes an accessible name. If no accessible role exists, file an accessibility issue against the component.',
					),
				);
			}
		}

		return violations;
	}

	private isGetByTestIdCall(call: CallExpression): boolean {
		return getMethodName(call) === 'getByTestId';
	}
}
