import type { Project, SourceFile } from 'ts-morph';
import { BaseRule } from './base-rule';
import type { Violation } from '../core/types';
import { isPageFile, isN8nPageFile, isBasePageFile } from '../utils/path-helpers';

/**
 * Boundary Protection Rule
 *
 * Ensures pages don't import from other pages (except components and BasePage).
 * This prevents tight coupling between page objects.
 *
 * Allowed imports:
 * - pages/components/* (component imports)
 * - BasePage (inheritance)
 * - External packages
 *
 * Violations:
 * - Importing from another page file (e.g., CanvasPage importing WorkflowsPage)
 */
export class BoundaryProtectionRule extends BaseRule {
	readonly id = 'boundary-protection';
	readonly name = 'Boundary Protection';
	readonly description = 'Pages should not import from other page files';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		return ['pages/**/*.ts'];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const filePath = file.getFilePath();

			// Skip n8nPage.ts, BasePage.ts, and component files
			if (isN8nPageFile(filePath) || isBasePageFile(filePath) || !isPageFile(filePath)) {
				continue;
			}

			const imports = file.getImportDeclarations();

			for (const importDecl of imports) {
				const importPath = importDecl.getModuleSpecifierValue();

				// Check for cross-page imports
				if (this.isCrossPageImport(importPath, filePath)) {
					const startLine = importDecl.getStartLineNumber();
					const startColumn = importDecl.getStart() - importDecl.getStartLinePos();

					violations.push(
						this.createViolation(
							file,
							startLine,
							startColumn,
							`Cross-page import detected: "${importPath}"`,
							'Import components or helpers instead, or extract shared logic',
						),
					);
				}
			}
		}

		return violations;
	}

	/**
	 * Check if an import is a cross-page import (importing from another page)
	 */
	private isCrossPageImport(importPath: string, _currentFilePath: string): boolean {
		// External packages are allowed
		if (!importPath.startsWith('.')) {
			return false;
		}

		// Normalize paths
		const normalizedImport = importPath.replace(/\\/g, '/');

		// Imports to components are allowed
		if (normalizedImport.includes('/components/') || normalizedImport.includes('/components')) {
			return false;
		}

		// BasePage import is allowed (inheritance)
		if (normalizedImport.endsWith('/BasePage') || normalizedImport === './BasePage') {
			return false;
		}

		// Imports outside of pages directory are allowed
		if (normalizedImport.startsWith('../') && !normalizedImport.includes('/pages/')) {
			// Check if it navigates out of pages
			const upLevels = (normalizedImport.match(/\.\.\//g) || []).length;
			if (upLevels > 0) {
				// If navigating up and not back into pages, it's allowed
				const afterUp = normalizedImport.replace(/^\.\.\//g, '');
				if (!afterUp.includes('/pages/') && !afterUp.startsWith('pages/')) {
					return false;
				}
			}
		}

		// Sibling imports within pages/ (not components) are violations
		// e.g., ./WorkflowsPage from ./CanvasPage
		if (normalizedImport.startsWith('./')) {
			// Remove the ./ prefix
			const afterPrefix = normalizedImport.slice(2);
			// Check if it's a direct sibling import (no subdirectory)
			// e.g., ./WorkflowsPage but not ./components/Something
			if (!afterPrefix.includes('/')) {
				// If it's not BasePage, it's a cross-page import
				if (afterPrefix !== 'BasePage') {
					return true;
				}
			}
		}

		// Check for explicit sibling page imports with directory
		if (normalizedImport.match(/^\.\.\/([\w]+)$/)) {
			// ../SomePage - going up one level and importing a page
			return true;
		}

		return false;
	}
}
