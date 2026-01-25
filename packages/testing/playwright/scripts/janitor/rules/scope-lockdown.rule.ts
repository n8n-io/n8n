import { SyntaxKind, type Project, type SourceFile, type ClassDeclaration } from 'ts-morph';
import { BaseRule } from './base-rule';
import type { Violation } from '../core/types';
import { isPageFile, isN8nPageFile, isBasePageFile, isComponentFile } from '../utils/path-helpers';
import {
	hasContainerMember,
	getCallExpressions,
	isUnscopedPageCall,
	isPageLevelMethod,
} from '../utils/ast-helpers';

/**
 * Scope Lockdown Rule
 *
 * Ensures page classes have a container and all locator calls are scoped to it.
 *
 * Checks:
 * 1. Every page class must have `container` property/getter OR `getContainer()` method
 * 2. All locator calls must chain from `this.container`, not `this.page`
 *
 * Exceptions:
 * - Standalone pages: Pages with a navigation method (default: `goto`) are considered
 *   full-page views that don't need container scoping
 * - Page-level methods: goto, waitForResponse, waitForURL, evaluate, keyboard, reload, etc.
 * - BasePage helper methods (protected, intended for inheritance)
 * - Components (they already use root: Locator pattern)
 *
 * Configuration:
 * - navigationMethod: Method name that indicates a standalone page (default: 'goto')
 *   Pages with this method are exempt from container requirements
 */
export class ScopeLockdownRule extends BaseRule {
	readonly id = 'scope-lockdown';
	readonly name = 'Scope Lockdown';
	readonly description = 'Pages must scope locators to container element';
	readonly severity = 'error' as const;

	/** Default navigation method name that indicates a standalone page */
	private static readonly DEFAULT_NAVIGATION_METHOD = 'goto';

	getTargetGlobs(): string[] {
		return ['pages/**/*.ts'];
	}

	/**
	 * Get the configured navigation method name
	 */
	private getNavigationMethod(): string {
		return (this.config.navigationMethod as string) || ScopeLockdownRule.DEFAULT_NAVIGATION_METHOD;
	}

	/**
	 * Check if a class has a navigation method (indicating it's a standalone page)
	 */
	private isStandalonePage(classDecl: ClassDeclaration): boolean {
		const navMethod = this.getNavigationMethod();
		return classDecl.getMethod(navMethod) !== undefined;
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const filePath = file.getFilePath();

			// Skip n8nPage.ts, BasePage.ts, and component files
			if (
				isN8nPageFile(filePath) ||
				isBasePageFile(filePath) ||
				!isPageFile(filePath) ||
				isComponentFile(filePath)
			) {
				continue;
			}

			// Analyze each class in the file
			for (const classDecl of file.getClasses()) {
				const className = classDecl.getName();
				if (!className) continue;

				// Skip if extends BasePage helper methods (they're protected for inheritance)
				if (className === 'FloatingUiHelper') continue;

				// Skip standalone pages (those with navigation method like goto)
				// These are full-page views that don't need container scoping
				if (this.isStandalonePage(classDecl)) {
					continue;
				}

				// Check 1: Container member exists
				if (!hasContainerMember(classDecl)) {
					const startLine = classDecl.getStartLineNumber();
					violations.push(
						this.createViolation(
							file,
							startLine,
							1,
							`Class "${className}" is missing container property/getter`,
							'Add a container property: `get container() { return this.page.getByTestId("..."); }`',
						),
					);
				}

				// Check 2: All locator calls are scoped
				const unscopedCalls = this.findUnscopedLocatorCalls(classDecl);
				for (const call of unscopedCalls) {
					const startLine = call.getStartLineNumber();
					const startColumn = call.getStart() - call.getStartLinePos();
					const callText = call.getText();

					// Extract the method being called
					const methodMatch = callText.match(/this\.page\.([\w]+)/);
					const method = methodMatch ? methodMatch[1] : 'locator';

					violations.push(
						this.createViolation(
							file,
							startLine,
							startColumn,
							`Locator not scoped to container: ${this.truncateText(callText, 60)}`,
							`Use this.container.${method}(...) instead of this.page.${method}(...)`,
						),
					);
				}
			}
		}

		return violations;
	}

	/**
	 * Find all locator calls that go through this.page instead of this.container
	 */
	private findUnscopedLocatorCalls(classDecl: ClassDeclaration) {
		const calls = getCallExpressions(classDecl);
		const unscopedCalls: ReturnType<(typeof calls)[number]['getExpression']>[] = [];

		for (const call of calls) {
			// Skip page-level methods (goto, waitFor*, etc.)
			if (isPageLevelMethod(call)) {
				continue;
			}

			// Check if it's an unscoped locator call
			if (isUnscopedPageCall(call)) {
				// Check if we're inside the container getter - this is allowed
				// because the container getter is where you define the container
				const parentGetter = call.getFirstAncestorByKind(SyntaxKind.GetAccessor);
				if (parentGetter?.getName() === 'container') {
					continue;
				}

				// Check if we're inside the getContainer method - also allowed
				const parentMethod = call.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);
				if (parentMethod?.getName() === 'getContainer') {
					continue;
				}

				// Check if we're inside a protected method (BasePage helpers)
				if (parentMethod?.hasModifier(SyntaxKind.ProtectedKeyword)) {
					continue;
				}

				// Check if we're in a property initializer creating a component
				// e.g., readonly logsPanel = new LogsPanel(this.page.getByTestId('logs-panel'))
				// This is acceptable as it's scoping the component
				const parentProperty = call.getFirstAncestorByKind(SyntaxKind.PropertyDeclaration);
				if (parentProperty) {
					const initializer = parentProperty.getInitializer();
					if (initializer?.getKind() === SyntaxKind.NewExpression) {
						continue;
					}
				}

				unscopedCalls.push(call);
			}
		}

		return unscopedCalls;
	}

	private truncateText(text: string, maxLength: number): string {
		const singleLine = text.replace(/\s+/g, ' ');
		if (singleLine.length <= maxLength) {
			return singleLine;
		}
		return singleLine.slice(0, maxLength - 3) + '...';
	}
}
