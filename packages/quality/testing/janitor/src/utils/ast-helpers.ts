import { SyntaxKind, type ClassDeclaration, type CallExpression, type SourceFile } from 'ts-morph';

/** Locator method names that we track for scoping */
export const LOCATOR_METHODS = [
	'getByTestId',
	'getByRole',
	'getByText',
	'getByLabel',
	'getByPlaceholder',
	'getByAltText',
	'getByTitle',
	'locator',
];

/** Page-level methods that are legitimate to call on page directly */
export const PAGE_LEVEL_METHODS = [
	'goto',
	'waitForResponse',
	'waitForURL',
	'waitForLoadState',
	'waitForTimeout',
	'waitForSelector',
	'waitForNavigation',
	'evaluate',
	'keyboard',
	'mouse',
	'reload',
	'goBack',
	'goForward',
	'route',
	'unroute',
	'setViewportSize',
	'screenshot',
	'close',
	'isClosed',
	'url',
	'title',
	'content',
	'bringToFront',
	'context',
	'on',
	'once',
	'off',
	'removeListener',
];

/**
 * Check if a class has a container property, getter, or getContainer method
 */
export function hasContainerMember(classDecl: ClassDeclaration): boolean {
	const hasProperty = classDecl.getProperty('container') !== undefined;
	const hasGetter = classDecl.getGetAccessor('container') !== undefined;
	const hasMethod = classDecl.getMethod('getContainer') !== undefined;

	return hasProperty || hasGetter || hasMethod;
}

/**
 * Get all call expressions within a class
 */
export function getCallExpressions(classDecl: ClassDeclaration): CallExpression[] {
	return classDecl.getDescendantsOfKind(SyntaxKind.CallExpression);
}

/**
 * Check if a call expression is a locator call (getByTestId, locator, etc.)
 */
export function isLocatorCall(call: CallExpression): boolean {
	const expr = call.getExpression();
	const text = expr.getText();

	return LOCATOR_METHODS.some((method) => text.endsWith(`.${method}`));
}

/**
 * Check if a call expression starts with this.page (unscoped locator)
 */
export function isUnscopedPageCall(call: CallExpression): boolean {
	const expr = call.getExpression();
	const text = expr.getText();

	// Check for this.page.getByTestId, this.page.locator, etc.
	return LOCATOR_METHODS.some((method) => text.startsWith(`this.page.${method}`));
}

/**
 * Check if a call is a page-level method (legitimate to call on page)
 */
export function isPageLevelMethod(call: CallExpression): boolean {
	const expr = call.getExpression();
	const text = expr.getText();

	// Check for this.page.goto, this.page.waitForResponse, etc.
	return PAGE_LEVEL_METHODS.some(
		(method) => text.startsWith(`this.page.${method}`) || text === `this.page.${method}`,
	);
}

/**
 * Get the method name from a call expression
 */
export function getMethodName(call: CallExpression): string | undefined {
	const expr = call.getExpression();
	if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
		const propAccess = expr.asKind(SyntaxKind.PropertyAccessExpression);
		return propAccess?.getName();
	}
	return undefined;
}

/**
 * Get all import paths from a source file
 */
export function getImportPaths(file: SourceFile): string[] {
	return file.getImportDeclarations().map((imp) => imp.getModuleSpecifierValue());
}

/**
 * Check if an import path points to a pages file (excluding components)
 */
export function isPageImport(importPath: string, currentFilePath: string): boolean {
	// Relative imports starting with ./pages/ or ../pages/
	if (importPath.includes('/pages/') && !importPath.includes('/pages/components/')) {
		return true;
	}

	// Handle relative imports from within pages directory
	const normalized = importPath.replace(/\\/g, '/');
	if (normalized.startsWith('./') || normalized.startsWith('../')) {
		// If current file is in pages/, check if import is also a page (not component)
		if (currentFilePath.includes('/pages/') && !currentFilePath.includes('/pages/components/')) {
			// Import to a sibling page file (not going into components/)
			if (!normalized.includes('/components/') && !normalized.includes('/components')) {
				const parts = normalized.split('/');
				const lastPart = parts[parts.length - 1];
				// If it's a direct sibling import (like ./WorkflowPage or ../SomePage)
				// and not going into a subdirectory like ./components/
				if (
					parts.length === 2 &&
					(parts[0] === '.' || parts[0] === '..') &&
					!lastPart.startsWith('Base')
				) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Get string literal argument from getByTestId calls
 */
export function getTestIdArgument(call: CallExpression): string | undefined {
	const methodName = getMethodName(call);
	if (methodName !== 'getByTestId') return undefined;

	const args = call.getArguments();
	if (args.length === 0) return undefined;

	const firstArg = args[0];
	if (firstArg.getKind() === SyntaxKind.StringLiteral) {
		const stringLit = firstArg.asKind(SyntaxKind.StringLiteral);
		return stringLit?.getLiteralText();
	}

	return undefined;
}

/**
 * Truncate text for display, collapsing whitespace
 */
export function truncateText(text: string, maxLength: number): string {
	const singleLine = text.replace(/\s+/g, ' ');
	if (singleLine.length <= maxLength) {
		return singleLine;
	}
	return singleLine.slice(0, maxLength - 3) + '...';
}
