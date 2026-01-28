import type { Project, SourceFile } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { getImportPaths, isPageImport } from '../utils/ast-helpers.js';
import { isExcludedPage } from '../utils/paths.js';

/**
 * Boundary Protection Rule
 *
 * Pages should not import other pages directly.
 * This prevents tight coupling between page objects.
 *
 * Allowed:
 * - Imports from components directory
 * - Imports from base classes (BasePage, BaseModal, etc.)
 * - Imports from external packages
 *
 * Violations:
 * - import { CanvasPage } from './CanvasPage' (in a page file)
 * - import { WorkflowPage } from '../WorkflowPage'
 */
export class BoundaryProtectionRule extends BaseRule {
	readonly id = 'boundary-protection';
	readonly name = 'Boundary Protection';
	readonly description = 'Pages should not import other pages directly';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		const config = getConfig();
		// Only analyze page files (excluding components)
		return config.patterns.pages.filter((p) => !p.includes('components'));
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];

		for (const file of files) {
			const filePath = file.getFilePath();

			// Skip excluded files (facades, base classes)
			if (isExcludedPage(filePath)) {
				continue;
			}

			// Skip if file is in components directory
			if (filePath.includes('/components/')) {
				continue;
			}

			const importPaths = getImportPaths(file);

			for (const importPath of importPaths) {
				if (isPageImport(importPath, filePath)) {
					const importDecl = file
						.getImportDeclarations()
						.find((d) => d.getModuleSpecifierValue() === importPath);

					if (importDecl) {
						violations.push(
							this.createViolation(
								file,
								importDecl.getStartLineNumber(),
								0,
								`Page imports another page: ${importPath}`,
								'Use composition through composables or inject via constructor instead',
							),
						);
					}
				}
			}
		}

		return violations;
	}
}
