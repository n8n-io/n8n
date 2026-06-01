import {
	SyntaxKind,
	type Project,
	type SourceFile,
	type CallExpression,
	type ClassDeclaration,
} from 'ts-morph';

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
import { isExcludedPage, isComponentFile } from '../utils/paths.js';

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
 * Check if a class has a navigation method (indicating it's a standalone top-level page)
 */
function hasNavigationMethod(classDecl: ClassDeclaration, methodNames: string[]): boolean {
	const methods = classDecl.getMethods();
	return methods.some((method) => methodNames.includes(method.getName()));
}

/**
 * Scope Lockdown Rule
 *
 * Page classes with a container must scope all locators to that container.
 * This ensures isolation and prevents selector conflicts.
 *
 * A page must either:
 * 1. Have a container property/getter and use it for all locators (scoped component/section)
 * 2. Have a navigation method (standalone top-level page, can use this.page directly)
 *
 * Violations:
 * - Page with container using this.page.getByTestId() instead of this.container.getByTestId()
 * - Page with neither container nor navigation method (ambiguous architecture)
 *
 * Allowed:
 * - this.page.goto(), this.page.waitForURL() etc. (page-level operations)
 * - Pages with navigation methods (explicit standalone pages)
 */
export class ScopeLockdownRule extends BaseRule {
	readonly id = 'scope-lockdown';
	readonly name = 'Scope Lockdown';
	readonly description = 'Page locators must be scoped to container';
	readonly severity = 'error' as const;

	private getNavigationMethods(): string[] {
		const config = getConfig();
		return config.rules?.['scope-lockdown']?.navigationMethods ?? ['goto'];
	}

	getTargetGlobs(): string[] {
		const config = getConfig();
		return config.patterns.pages;
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];
		const navigationMethods = this.getNavigationMethods();

		for (const file of files) {
			const filePath = file.getFilePath();

			// Skip excluded files
			if (isExcludedPage(filePath)) {
				continue;
			}

			// Skip component files (they use a different pattern with root locator)
			if (isComponentFile(filePath)) {
				continue;
			}

			for (const classDecl of file.getClasses()) {
				const className = classDecl.getName() ?? 'Anonymous';
				const hasContainer = hasContainerMember(classDecl);
				const hasNavMethod = hasNavigationMethod(classDecl, navigationMethods);

				// Check for ambiguous pages (neither container nor navigation method)
				if (!hasContainer && !hasNavMethod) {
					const startLine = classDecl.getStartLineNumber();
					const startColumn = classDecl.getStart() - classDecl.getStartLinePos();

					violations.push(
						this.createViolation(
							file,
							startLine,
							startColumn,
							`${className}: Ambiguous page - add a container (for scoped components) or a navigation method (for top-level pages)`,
							`Add a 'container' getter or a navigation method (${navigationMethods.join(', ')})`,
						),
					);
					continue;
				}

				// Skip classes without container but with navigation method (explicit standalone pages)
				if (!hasContainer && hasNavMethod) {
					continue;
				}

				// For classes with container, check for unscoped locator calls
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
