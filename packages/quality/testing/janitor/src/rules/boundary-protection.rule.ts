import type { Violation } from '@n8n/rules-engine';
import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import type { Project } from 'ts-morph';

import { getConfig } from '../config.js';
import { isPageImport } from '../utils/ast-helpers.js';
import { isExcludedPage } from '../utils/paths.js';

/**
 * Pages must not import other pages directly. Janitor-owned (playwright domain
 * logic via {@link isPageImport} + config-driven {@link isExcludedPage}) but
 * built on the shared `@n8n/rules-engine/ast` substrate rather than a janitor base.
 */
export class BoundaryProtectionRule extends AstRule<{ rootDir: string }> {
	readonly id = 'boundary-protection';
	readonly name = 'Boundary Protection';
	readonly description = 'Page objects should not import other page objects directly';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		return getConfig().patterns.pages.filter((p) => !p.includes('components'));
	}

	protected projectConfig(): AstProjectConfig {
		return { packages: ['.'], spec: { globs: this.getTargetGlobs() } };
	}

	analyze(context: { rootDir: string }): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	analyzeProject(project: Project): Violation[] {
		const violations: Violation[] = [];

		for (const file of project.getSourceFiles()) {
			const filePath = file.getFilePath();
			if (isExcludedPage(filePath)) continue;
			if (filePath.includes('/components/')) continue;

			for (const decl of file.getImportDeclarations()) {
				const spec = decl.getModuleSpecifierValue();
				if (isPageImport(spec, filePath)) {
					violations.push(
						this.nodeViolation(
							decl,
							`Page imports another page: ${spec}`,
							'Use composition through composables or inject via constructor instead',
						),
					);
				}
			}
		}

		return violations;
	}
}
