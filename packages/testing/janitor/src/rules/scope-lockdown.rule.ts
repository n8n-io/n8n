import { SyntaxKind, type Project, type SourceFile, type CallExpression } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import {
	hasContainerMember,
	getCallExpressions,
	isUnscopedPageCall,
	isPageLevelMethod,
	isLocatorCall,
} from '../utils/ast-helpers.js';
import { isExcludedPage } from '../utils/paths.js';

/**
 * Check if a call expression is inside a container getter or property definition
 */
function isInsideContainerDefinition(call: CallExpression): boolean {
	let ancestor = call.getParent();
	while (ancestor) {
		// Check if we're inside a getter accessor named 'container'
		if (ancestor.getKind() === SyntaxKind.GetAccessor) {
			const getter = ancestor.asKind(SyntaxKind.GetAccessor);
			if (getter?.getName() === 'container') {
				return true;
			}
		}
		// Check if we're inside a property declaration named 'container'
		if (ancestor.getKind() === SyntaxKind.PropertyDeclaration) {
			const prop = ancestor.asKind(SyntaxKind.PropertyDeclaration);
			if (prop?.getName() === 'container') {
				return true;
			}
		}
		ancestor = ancestor.getParent();
	}
	return false;
}

/**
 * Scope Lockdown Rule
 *
 * Page classes with a container must scope all locators to that container.
 * This ensures isolation and prevents selector conflicts.
 *
 * A page must either:
 * 1. Have a container property/getter and use it for all locators
 * 2. Not have a container (standalone page like LoginPage)
 *
 * Violations:
 * - Page with container using this.page.getByTestId() instead of this.container.getByTestId()
 * - Page with container using unscoped locators
 *
 * Allowed:
 * - this.page.goto(), this.page.waitForURL() etc. (page-level operations)
 * - Pages without containers (navigate via goto)
 */
export class ScopeLockdownRule extends BaseRule {
	readonly id = 'scope-lockdown';
	readonly name = 'Scope Lockdown';
	readonly description = 'Page locators must be scoped to container';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		const config = getConfig();
		return config.patterns.pages;
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const filePath = file.getFilePath();

			// Skip excluded files
			if (isExcludedPage(filePath)) {
				continue;
			}

			for (const classDecl of file.getClasses()) {
				// Skip classes without container (standalone pages)
				if (!hasContainerMember(classDecl)) {
					continue;
				}

				const className = classDecl.getName() ?? 'Anonymous';
				const calls = getCallExpressions(classDecl);

				for (const call of calls) {
					// Skip page-level methods (goto, waitForURL, etc.)
					if (isPageLevelMethod(call)) {
						continue;
					}

					// Skip locator calls inside container definitions (e.g., get container() { return this.page.locator(...) })
					if (isInsideContainerDefinition(call)) {
						continue;
					}

					// Check for unscoped page locator calls
					if (isUnscopedPageCall(call) && isLocatorCall(call)) {
						const startLine = call.getStartLineNumber();
						const startColumn = call.getStart() - call.getStartLinePos();

						violations.push(
							this.createViolation(
								file,
								startLine,
								startColumn,
								`${className}: Unscoped locator - use this.container instead of this.page`,
								'Replace this.page.getByTestId(...) with this.container.getByTestId(...)',
							),
						);
					}
				}
			}
		}

		return violations;
	}
}
